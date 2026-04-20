import crypto from "node:crypto";

import type { Prisma } from "../../generated/prisma/client";
import { ActivityEventType, InviteStatus } from "../../generated/prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/app-error";
import type { CreateInviteInput } from "./invite.schemas";

const INVITE_TTL_DAYS = 7;
const INVITE_TOKEN_BYTES = 32;

const safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

type SafeUserRecord = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

const pendingInviteSelect = {
  id: true,
  projectId: true,
  email: true,
  status: true,
  createdAt: true,
  expiresAt: true,
  invitedBy: {
    select: safeUserSelect
  }
} satisfies Prisma.InviteSelect;

const toSafeUser = (user: SafeUserRecord) => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const toInvite = (invite: {
  id: string;
  projectId: string;
  email: string;
  status: InviteStatus;
  createdAt: Date;
  expiresAt: Date;
  invitedBy: SafeUserRecord;
}) => {
  return {
    id: invite.id,
    projectId: invite.projectId,
    email: invite.email,
    status: invite.status,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    invitedBy: toSafeUser(invite.invitedBy)
  };
};

const generateInviteToken = () => {
  return crypto.randomBytes(INVITE_TOKEN_BYTES).toString("hex");
};

const buildInviteExpiry = () => {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
};

const buildInviteAcceptUrl = (token: string) => {
  return `${env.appBaseUrl.replace(/\/$/, "")}/invites/${token}/accept`;
};

export const createInvite = async (
  projectId: string,
  invitedById: string,
  input: CreateInviteInput
) => {
  const email = input.email.trim().toLowerCase();

  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId,
      user: {
        email
      }
    },
    select: {
      id: true
    }
  });

  if (existingMember) {
    throw new AppError(409, `${email} is already a member of this project.`);
  }

  const existingPendingInvite = await prisma.invite.findFirst({
    where: {
      projectId,
      email,
      status: InviteStatus.PENDING,
      expiresAt: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      expiresAt: true
    }
  });

  if (existingPendingInvite) {
    throw new AppError(
      409,
      `An active invite for ${email} already exists and expires at ${existingPendingInvite.expiresAt.toISOString()}.`
    );
  }

  const token = generateInviteToken();
  const expiresAt = buildInviteExpiry();

  const invite = await prisma.$transaction(async (tx) => {
    const createdInvite = await tx.invite.create({
      data: {
        projectId,
        email,
        token,
        invitedById,
        expiresAt
      },
      select: pendingInviteSelect
    });

    await tx.activityEvent.create({
      data: {
        projectId,
        type: ActivityEventType.INVITE_SENT,
        metadata: {
          inviteId: createdInvite.id,
          email,
          invitedById,
          expiresAt: createdInvite.expiresAt.toISOString()
        }
      }
    });

    return createdInvite;
  });

  return {
    invite: toInvite(invite),
    token,
    acceptUrl: buildInviteAcceptUrl(token)
  };
};

export const listPendingInvites = async (projectId: string) => {
  const invites = await prisma.invite.findMany({
    where: {
      projectId,
      status: InviteStatus.PENDING,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: pendingInviteSelect
  });

  return {
    invites: invites.map(toInvite)
  };
};

export const acceptInvite = async (token: string, userId: string, userEmail: string) => {
  const normalizedEmail = userEmail.trim().toLowerCase();

  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      id: true,
      projectId: true,
      email: true,
      status: true,
      expiresAt: true
    }
  });

  if (!invite) {
    throw new AppError(404, "Invite not found.");
  }

  if (invite.email !== normalizedEmail) {
    throw new AppError(403, "This invite was issued to a different email address.");
  }

  if (invite.status !== InviteStatus.PENDING) {
    throw new AppError(409, `This invite is no longer pending. Current status: ${invite.status}.`);
  }

  if (invite.expiresAt <= new Date()) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.EXPIRED
      }
    });

    throw new AppError(410, "This invite has expired.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingMembership = await tx.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: invite.projectId,
          userId
        }
      },
      select: {
        id: true,
        joinedAt: true
      }
    });

    const membership =
      existingMembership ??
      (await tx.projectMember.create({
        data: {
          projectId: invite.projectId,
          userId
        },
        select: {
          id: true,
          joinedAt: true
        }
      }));

    const acceptedInvite = await tx.invite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED
      },
      select: {
        id: true,
        projectId: true,
        email: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        invitedBy: {
          select: safeUserSelect
        }
      }
    });

    await tx.activityEvent.create({
      data: {
        projectId: invite.projectId,
        type: ActivityEventType.INVITE_ACCEPTED,
        metadata: {
          inviteId: invite.id,
          email: invite.email,
          acceptedById: userId,
          membershipId: membership.id,
          membershipCreated: !existingMembership
        }
      }
    });

    return {
      invite: acceptedInvite,
      membership
    };
  });

  return {
    invite: toInvite(result.invite),
    membership: {
      id: result.membership.id,
      projectId: invite.projectId,
      userId,
      joinedAt: result.membership.joinedAt
    }
  };
};
