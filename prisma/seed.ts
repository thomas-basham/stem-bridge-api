import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  ActivityEventType,
  FileAssetType,
  InviteStatus,
  Prisma,
  PrismaClient
} from "../src/generated/prisma/client";

import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";
const OWNER_EMAIL = "owner@stembridge.dev";
const COLLABORATOR_EMAIL = "collaborator@stembridge.dev";
const PROJECT_NAME = "StemBridge Demo Project";

const minutesAgo = (minutes: number) => {
  return new Date(Date.now() - minutes * 60 * 1000);
};

const main = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      passwordHash
    },
    create: {
      email: OWNER_EMAIL,
      passwordHash
    }
  });

  const collaborator = await prisma.user.upsert({
    where: { email: COLLABORATOR_EMAIL },
    update: {
      passwordHash
    },
    create: {
      email: COLLABORATOR_EMAIL,
      passwordHash
    }
  });

  const existingProject = await prisma.project.findFirst({
    where: {
      name: PROJECT_NAME,
      ownerId: owner.id
    },
    select: {
      id: true
    }
  });

  if (existingProject) {
    await prisma.project.delete({
      where: {
        id: existingProject.id
      }
    });
  }

  const project = await prisma.project.create({
    data: {
      name: PROJECT_NAME,
      bpm: 128,
      musicalKey: "A Minor",
      ownerId: owner.id,
      createdAt: minutesAgo(240),
      updatedAt: minutesAgo(15)
    }
  });

  await prisma.projectMember.createMany({
    data: [
      {
        projectId: project.id,
        userId: owner.id,
        joinedAt: minutesAgo(239)
      },
      {
        projectId: project.id,
        userId: collaborator.id,
        joinedAt: minutesAgo(210)
      }
    ]
  });

  const versionOne = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      notes: "Initial arrangement with drums, bass, and synth layers.",
      createdById: owner.id,
      createdAt: minutesAgo(180)
    }
  });

  const versionTwo = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 2,
      notes: "Updated mix with tighter drums and new lead automation.",
      createdById: collaborator.id,
      createdAt: minutesAgo(60)
    }
  });

  await prisma.fileAsset.createMany({
    data: [
      {
        songVersionId: versionOne.id,
        name: "drum-bus.wav",
        originalName: "Drum Bus.wav",
        type: FileAssetType.STEM,
        mimeType: "audio/wav",
        sizeBytes: 8_245_321,
        storageKey: `projects/${project.id}/versions/${versionOne.id}/1700000000000-drum-bus.wav`,
        url: `https://example-bucket.s3.us-west-2.amazonaws.com/projects/${project.id}/versions/${versionOne.id}/1700000000000-drum-bus.wav`,
        createdAt: minutesAgo(175)
      },
      {
        songVersionId: versionOne.id,
        name: "rough-mix-v1.wav",
        originalName: "rough-mix-v1.wav",
        type: FileAssetType.MIX,
        mimeType: "audio/wav",
        sizeBytes: 12_842_111,
        storageKey: `projects/${project.id}/versions/${versionOne.id}/1700000000001-rough-mix-v1.wav`,
        url: `https://example-bucket.s3.us-west-2.amazonaws.com/projects/${project.id}/versions/${versionOne.id}/1700000000001-rough-mix-v1.wav`,
        createdAt: minutesAgo(174)
      },
      {
        songVersionId: versionTwo.id,
        name: "lead-synth.mid",
        originalName: "Lead Synth.mid",
        type: FileAssetType.MIDI,
        mimeType: "audio/midi",
        sizeBytes: 48_120,
        storageKey: `projects/${project.id}/versions/${versionTwo.id}/1700000000002-lead-synth.mid`,
        url: `https://example-bucket.s3.us-west-2.amazonaws.com/projects/${project.id}/versions/${versionTwo.id}/1700000000002-lead-synth.mid`,
        createdAt: minutesAgo(52)
      },
      {
        songVersionId: versionTwo.id,
        name: "rough-mix-v2.wav",
        originalName: "rough-mix-v2.wav",
        type: FileAssetType.MIX,
        mimeType: "audio/wav",
        sizeBytes: 13_104_442,
        storageKey: `projects/${project.id}/versions/${versionTwo.id}/1700000000003-rough-mix-v2.wav`,
        url: `https://example-bucket.s3.us-west-2.amazonaws.com/projects/${project.id}/versions/${versionTwo.id}/1700000000003-rough-mix-v2.wav`,
        createdAt: minutesAgo(50)
      }
    ]
  });

  await prisma.comment.createMany({
    data: [
      {
        songVersionId: versionOne.id,
        userId: collaborator.id,
        timestampSeconds: new Prisma.Decimal("12.5"),
        text: "Kick feels a little heavy here.",
        createdAt: minutesAgo(170)
      },
      {
        songVersionId: versionOne.id,
        userId: owner.id,
        timestampSeconds: new Prisma.Decimal("34.2"),
        text: "Good catch. I’ll pull that back in the next pass.",
        createdAt: minutesAgo(165)
      },
      {
        songVersionId: versionTwo.id,
        userId: owner.id,
        timestampSeconds: new Prisma.Decimal("46.8"),
        text: "Lead automation is working much better now.",
        createdAt: minutesAgo(42)
      }
    ]
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        projectId: project.id,
        type: ActivityEventType.PROJECT_CREATED,
        metadata: {
          ownerId: owner.id,
          projectName: PROJECT_NAME
        },
        createdAt: minutesAgo(240)
      },
      {
        projectId: project.id,
        type: ActivityEventType.MEMBER_ADDED,
        metadata: {
          addedUserId: collaborator.id,
          addedById: owner.id
        },
        createdAt: minutesAgo(210)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: {
          versionId: versionOne.id,
          versionNumber: 1,
          createdById: owner.id
        },
        createdAt: minutesAgo(180)
      },
      {
        projectId: project.id,
        type: ActivityEventType.FILE_UPLOADED,
        metadata: {
          versionId: versionOne.id,
          fileCount: 2
        },
        createdAt: minutesAgo(174)
      },
      {
        projectId: project.id,
        type: ActivityEventType.COMMENT_ADDED,
        metadata: {
          versionId: versionOne.id,
          authorId: collaborator.id
        },
        createdAt: minutesAgo(170)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: {
          versionId: versionTwo.id,
          versionNumber: 2,
          createdById: collaborator.id
        },
        createdAt: minutesAgo(60)
      },
      {
        projectId: project.id,
        type: ActivityEventType.FILE_UPLOADED,
        metadata: {
          versionId: versionTwo.id,
          fileCount: 2
        },
        createdAt: minutesAgo(50)
      },
      {
        projectId: project.id,
        type: ActivityEventType.COMMENT_ADDED,
        metadata: {
          versionId: versionTwo.id,
          authorId: owner.id
        },
        createdAt: minutesAgo(42)
      }
    ]
  });

  const inviteCount = await prisma.invite.count({
    where: {
      projectId: project.id,
      status: InviteStatus.PENDING
    }
  });

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        users: [OWNER_EMAIL, COLLABORATOR_EMAIL],
        projectId: project.id,
        songVersionIds: [versionOne.id, versionTwo.id],
        pendingInviteCount: inviteCount
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
