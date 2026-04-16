import { ProjectRole } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../database/prisma";
import { generateOpaqueToken, hashToken } from "../../lib/auth/jwt";
import { ApiError } from "../../lib/errors/api-error";
import type { CreateProjectInput, InviteCollaboratorInput } from "./projects.schemas";

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true
} as const;

const roleRank: Record<ProjectRole, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.EDITOR]: 2,
  [ProjectRole.OWNER]: 3
};

const serializeUser = (user: { id: string; email: string; displayName: string }) => {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
};

const serializeProjectSummary = (membership: {
  role: ProjectRole;
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    owner: { id: string; email: string; displayName: string };
    _count: { members: number; versions: number };
  };
}) => {
  return {
    id: membership.project.id,
    name: membership.project.name,
    description: membership.project.description,
    createdAt: membership.project.createdAt,
    updatedAt: membership.project.updatedAt,
    currentUserRole: membership.role,
    owner: serializeUser(membership.project.owner),
    memberCount: membership.project._count.members,
    versionCount: membership.project._count.versions
  };
};

const ensureProjectRole = async (
  userId: string,
  projectId: string,
  minimumRole: ProjectRole = ProjectRole.VIEWER
) => {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });

  if (!membership) {
    throw new ApiError(404, "Project not found.");
  }

  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }

  return membership;
};

export const listProjectsForUser = async (userId: string) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          owner: {
            select: publicUserSelect
          },
          _count: {
            select: {
              members: true,
              versions: true
            }
          }
        }
      }
    },
    orderBy: {
      joinedAt: "desc"
    }
  });

  return {
    projects: memberships.map(serializeProjectSummary)
  };
};

export const createProject = async (userId: string, input: CreateProjectInput) => {
  const project = await prisma.project.create({
    data: {
      name: input.name.trim(),
      description: input.description,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: ProjectRole.OWNER
        }
      }
    }
  });

  return getProjectById(userId, project.id);
};

export const getProjectById = async (userId: string, projectId: string) => {
  await ensureProjectRole(userId, projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: publicUserSelect
      },
      members: {
        include: {
          user: {
            select: publicUserSelect
          }
        },
        orderBy: [
          { role: "asc" },
          { joinedAt: "asc" }
        ]
      },
      invitations: {
        where: {
          acceptedAt: null,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          invitedBy: {
            select: publicUserSelect
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      _count: {
        select: {
          members: true,
          versions: true
        }
      }
    }
  });

  if (!project) {
    throw new ApiError(404, "Project not found.");
  }

  const currentUserMembership = project.members.find((member) => member.userId === userId);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      currentUserRole: currentUserMembership?.role ?? ProjectRole.VIEWER,
      owner: serializeUser(project.owner),
      memberCount: project._count.members,
      versionCount: project._count.versions,
      members: project.members.map((member) => ({
        role: member.role,
        joinedAt: member.joinedAt,
        user: serializeUser(member.user)
      })),
      pendingInvitations: project.invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy ? serializeUser(invitation.invitedBy) : null
      }))
    }
  };
};

export const inviteCollaborator = async (
  userId: string,
  projectId: string,
  input: InviteCollaboratorInput
) => {
  await ensureProjectRole(userId, projectId, ProjectRole.EDITOR);

  const email = input.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    const existingMembership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: existingUser.id
        }
      }
    });

    if (existingMembership) {
      throw new ApiError(409, "This user is already a member of the project.");
    }
  }

  const existingInvitation = await prisma.projectInvitation.findFirst({
    where: {
      projectId,
      email,
      acceptedAt: null,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (existingInvitation) {
    throw new ApiError(409, "There is already an active invitation for this email address.");
  }

  const invitationToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.projectInvitation.create({
    data: {
      projectId,
      email,
      role: input.role,
      invitedById: userId,
      tokenHash: hashToken(invitationToken),
      expiresAt
    }
  });

  return {
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt
    },
    invitationToken,
    acceptUrl: env.CLIENT_ORIGIN
      ? `${env.CLIENT_ORIGIN.replace(/\/$/, "")}/invitations/${invitationToken}`
      : null
  };
};

export const acceptInvitation = async (userId: string, userEmail: string, token: string) => {
  const invitation = await prisma.projectInvitation.findUnique({
    where: {
      tokenHash: hashToken(token)
    }
  });

  if (!invitation) {
    throw new ApiError(404, "Invitation not found.");
  }

  if (invitation.acceptedAt) {
    throw new ApiError(409, "Invitation has already been accepted.");
  }

  if (invitation.expiresAt <= new Date()) {
    throw new ApiError(410, "Invitation has expired.");
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new ApiError(403, "This invitation was issued to a different email address.");
  }

  const existingMembership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: invitation.projectId,
        userId
      }
    }
  });

  await prisma.$transaction(async (tx) => {
    if (!existingMembership) {
      await tx.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId,
          role: invitation.role,
          invitedById: invitation.invitedById ?? undefined
        }
      });
    }

    await tx.projectInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() }
    });
  });

  return getProjectById(userId, invitation.projectId);
};

