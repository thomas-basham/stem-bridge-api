import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  ActivityEventType,
  FileAssetType,
  InviteStatus,
  Prisma,
  PrismaClient
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";

const DEMO_USERS = [
  "owner@stembridge.dev",
  "producer@stembridge.dev",
  "vocalist@stembridge.dev",
  "mixengineer@stembridge.dev"
] as const;

const DEMO_PROJECT_NAMES = [
  "Neon Skyline",
  "Harbor Lights",
  "Morning Circuit",
  "Archive Sketches"
] as const;

const minutesAgo = (minutes: number) => {
  return new Date(Date.now() - minutes * 60 * 1000);
};

const daysFromNow = (days: number) => {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const s3Url = (storageKey: string) => {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:4000";
  return `${baseUrl.replace(/\/$/, "")}/${storageKey}`;
};

const seedUsers = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = await Promise.all(
    DEMO_USERS.map((email) =>
      prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: { email, passwordHash }
      })
    )
  );

  return {
    owner: users[0],
    producer: users[1],
    vocalist: users[2],
    mixEngineer: users[3]
  };
};

const deleteExistingDemoProjects = async (ownerId: string) => {
  const existingProjects = await prisma.project.findMany({
    where: {
      ownerId,
      name: {
        in: [...DEMO_PROJECT_NAMES]
      }
    },
    select: {
      id: true
    }
  });

  if (existingProjects.length === 0) {
    return;
  }

  await prisma.project.deleteMany({
    where: {
      id: {
        in: existingProjects.map((project) => project.id)
      }
    }
  });
};

type SeedUserMap = Awaited<ReturnType<typeof seedUsers>>;

const createNeonSkylineProject = async (users: SeedUserMap) => {
  const project = await prisma.project.create({
    data: {
      name: "Neon Skyline",
      bpm: 128,
      musicalKey: "A Minor",
      ownerId: users.owner.id,
      createdAt: minutesAgo(1440),
      updatedAt: minutesAgo(22)
    }
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: users.owner.id, joinedAt: minutesAgo(1439) },
      { projectId: project.id, userId: users.producer.id, joinedAt: minutesAgo(1390) },
      { projectId: project.id, userId: users.mixEngineer.id, joinedAt: minutesAgo(430) }
    ]
  });

  const versionOne = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      notes: "Initial arrangement with drums, bass, pad, and arp stems.",
      createdById: users.owner.id,
      createdAt: minutesAgo(1320)
    }
  });

  const versionTwo = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 2,
      notes: "Rebuilt chorus lift, added sidechain movement, and cleaned up the bridge.",
      createdById: users.producer.id,
      createdAt: minutesAgo(720)
    }
  });

  const versionThree = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 3,
      notes: "Mix pass with tighter low end and printed automation.",
      createdById: users.mixEngineer.id,
      createdAt: minutesAgo(75)
    }
  });

  const files = [
    {
      songVersionId: versionOne.id,
      name: "drum-bus.wav",
      originalName: "Drum Bus.wav",
      type: FileAssetType.STEM,
      mimeType: "audio/wav",
      sizeBytes: 8_245_321,
      storageKey: `seed-assets/${project.id}/${versionOne.id}/drum-bus.wav`,
      createdAt: minutesAgo(1305)
    },
    {
      songVersionId: versionOne.id,
      name: "rough-mix-v1.wav",
      originalName: "Neon Skyline Rough Mix v1.wav",
      type: FileAssetType.MIX,
      mimeType: "audio/wav",
      sizeBytes: 12_842_111,
      storageKey: `seed-assets/${project.id}/${versionOne.id}/rough-mix-v1.wav`,
      createdAt: minutesAgo(1300)
    },
    {
      songVersionId: versionTwo.id,
      name: "lead-synth.mid",
      originalName: "Lead Synth.mid",
      type: FileAssetType.MIDI,
      mimeType: "audio/midi",
      sizeBytes: 48_120,
      storageKey: `seed-assets/${project.id}/${versionTwo.id}/lead-synth.mid`,
      createdAt: minutesAgo(705)
    },
    {
      songVersionId: versionTwo.id,
      name: "chorus-vocal-chop.wav",
      originalName: "Chorus Vocal Chop.wav",
      type: FileAssetType.SAMPLE,
      mimeType: "audio/wav",
      sizeBytes: 2_104_442,
      storageKey: `seed-assets/${project.id}/${versionTwo.id}/chorus-vocal-chop.wav`,
      createdAt: minutesAgo(701)
    },
    {
      songVersionId: versionThree.id,
      name: "neon-skyline-mix-v3.wav",
      originalName: "Neon Skyline Mix v3.wav",
      type: FileAssetType.MIX,
      mimeType: "audio/wav",
      sizeBytes: 14_998_044,
      storageKey: `seed-assets/${project.id}/${versionThree.id}/neon-skyline-mix-v3.wav`,
      createdAt: minutesAgo(62)
    },
    {
      songVersionId: versionThree.id,
      name: "mix-notes.pdf",
      originalName: "Mix Notes.pdf",
      type: FileAssetType.OTHER,
      mimeType: "application/pdf",
      sizeBytes: 184_288,
      storageKey: `seed-assets/${project.id}/${versionThree.id}/mix-notes.pdf`,
      createdAt: minutesAgo(58)
    }
  ];

  await prisma.fileAsset.createMany({
    data: files.map((file) => ({
      ...file,
      url: s3Url(file.storageKey)
    }))
  });

  await prisma.comment.createMany({
    data: [
      {
        songVersionId: versionOne.id,
        userId: users.producer.id,
        timestampSeconds: new Prisma.Decimal("12.5"),
        text: "Kick feels a little heavy before the bass enters.",
        createdAt: minutesAgo(1288)
      },
      {
        songVersionId: versionOne.id,
        userId: users.owner.id,
        timestampSeconds: new Prisma.Decimal("34.2"),
        text: "Good catch. I will pull that back in the next pass.",
        createdAt: minutesAgo(1280)
      },
      {
        songVersionId: versionTwo.id,
        userId: users.mixEngineer.id,
        timestampSeconds: new Prisma.Decimal("46.8"),
        text: "The chorus lift works now. I would carve a little more room around the lead.",
        createdAt: minutesAgo(680)
      },
      {
        songVersionId: versionThree.id,
        userId: users.owner.id,
        timestampSeconds: new Prisma.Decimal("58.0"),
        text: "Low end is translating much better on headphones.",
        createdAt: minutesAgo(44)
      },
      {
        songVersionId: versionThree.id,
        userId: users.producer.id,
        timestampSeconds: new Prisma.Decimal("91.4"),
        text: "Print this with the alternate outro before final delivery.",
        createdAt: minutesAgo(28)
      }
    ]
  });

  await prisma.invite.createMany({
    data: [
      {
        projectId: project.id,
        email: "vocalist@stembridge.dev",
        token: `seed-neon-vocalist-${project.id}`,
        status: InviteStatus.PENDING,
        invitedById: users.owner.id,
        createdAt: minutesAgo(120),
        expiresAt: daysFromNow(7)
      },
      {
        projectId: project.id,
        email: "manager@example.com",
        token: `seed-neon-manager-${project.id}`,
        status: InviteStatus.EXPIRED,
        invitedById: users.owner.id,
        createdAt: minutesAgo(20_160),
        expiresAt: minutesAgo(10_080)
      }
    ]
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        projectId: project.id,
        type: ActivityEventType.PROJECT_CREATED,
        metadata: { ownerId: users.owner.id, projectName: project.name },
        createdAt: minutesAgo(1440)
      },
      {
        projectId: project.id,
        type: ActivityEventType.MEMBER_ADDED,
        metadata: { addedUserId: users.producer.id, addedById: users.owner.id },
        createdAt: minutesAgo(1390)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: { versionId: versionOne.id, versionNumber: 1, createdById: users.owner.id },
        createdAt: minutesAgo(1320)
      },
      {
        projectId: project.id,
        type: ActivityEventType.FILE_UPLOADED,
        metadata: { versionId: versionOne.id, fileCount: 2 },
        createdAt: minutesAgo(1300)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: { versionId: versionTwo.id, versionNumber: 2, createdById: users.producer.id },
        createdAt: minutesAgo(720)
      },
      {
        projectId: project.id,
        type: ActivityEventType.INVITE_SENT,
        metadata: { email: "vocalist@stembridge.dev", invitedById: users.owner.id },
        createdAt: minutesAgo(120)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: {
          versionId: versionThree.id,
          versionNumber: 3,
          createdById: users.mixEngineer.id
        },
        createdAt: minutesAgo(75)
      },
      {
        projectId: project.id,
        type: ActivityEventType.COMMENT_ADDED,
        metadata: { versionId: versionThree.id, authorId: users.producer.id },
        createdAt: minutesAgo(28)
      }
    ]
  });

  return project;
};

const createHarborLightsProject = async (users: SeedUserMap) => {
  const project = await prisma.project.create({
    data: {
      name: "Harbor Lights",
      bpm: 92,
      musicalKey: "D Major",
      ownerId: users.owner.id,
      createdAt: minutesAgo(3960),
      updatedAt: minutesAgo(310)
    }
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: users.owner.id, joinedAt: minutesAgo(3958) },
      { projectId: project.id, userId: users.vocalist.id, joinedAt: minutesAgo(3300) }
    ]
  });

  const versionOne = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      notes: "Piano-led demo with scratch vocal and simple room percussion.",
      createdById: users.owner.id,
      createdAt: minutesAgo(3900)
    }
  });

  const versionTwo = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 2,
      notes: "Added final lead vocal comp and doubled harmony in the last chorus.",
      createdById: users.vocalist.id,
      createdAt: minutesAgo(360)
    }
  });

  const files = [
    {
      songVersionId: versionOne.id,
      name: "piano-demo.wav",
      originalName: "Harbor Lights Piano Demo.wav",
      type: FileAssetType.MIX,
      mimeType: "audio/wav",
      sizeBytes: 9_240_004,
      storageKey: `seed-assets/${project.id}/${versionOne.id}/piano-demo.wav`,
      createdAt: minutesAgo(3880)
    },
    {
      songVersionId: versionTwo.id,
      name: "lead-vocal-comp.wav",
      originalName: "Lead Vocal Comp.wav",
      type: FileAssetType.STEM,
      mimeType: "audio/wav",
      sizeBytes: 18_992_448,
      storageKey: `seed-assets/${project.id}/${versionTwo.id}/lead-vocal-comp.wav`,
      createdAt: minutesAgo(350)
    },
    {
      songVersionId: versionTwo.id,
      name: "harbor-lights-v2.wav",
      originalName: "Harbor Lights v2 Reference.wav",
      type: FileAssetType.MIX,
      mimeType: "audio/wav",
      sizeBytes: 5_120_884,
      storageKey: `seed-assets/${project.id}/${versionTwo.id}/harbor-lights-v2.wav`,
      createdAt: minutesAgo(344)
    }
  ];

  await prisma.fileAsset.createMany({
    data: files.map((file) => ({
      ...file,
      url: s3Url(file.storageKey)
    }))
  });

  await prisma.comment.createMany({
    data: [
      {
        songVersionId: versionTwo.id,
        userId: users.owner.id,
        timestampSeconds: new Prisma.Decimal("18.2"),
        text: "Lead vocal tone is right. The breath before verse two can stay.",
        createdAt: minutesAgo(320)
      },
      {
        songVersionId: versionTwo.id,
        userId: users.vocalist.id,
        timestampSeconds: new Prisma.Decimal("133.7"),
        text: "I can redo this harmony if you want it less bright.",
        createdAt: minutesAgo(312)
      }
    ]
  });

  await prisma.invite.create({
    data: {
      projectId: project.id,
      email: "producer@stembridge.dev",
      token: `seed-harbor-producer-${project.id}`,
      status: InviteStatus.ACCEPTED,
      invitedById: users.owner.id,
      createdAt: minutesAgo(3420),
      expiresAt: daysFromNow(2)
    }
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        projectId: project.id,
        type: ActivityEventType.PROJECT_CREATED,
        metadata: { ownerId: users.owner.id, projectName: project.name },
        createdAt: minutesAgo(3960)
      },
      {
        projectId: project.id,
        type: ActivityEventType.MEMBER_ADDED,
        metadata: { addedUserId: users.vocalist.id, addedById: users.owner.id },
        createdAt: minutesAgo(3300)
      },
      {
        projectId: project.id,
        type: ActivityEventType.INVITE_ACCEPTED,
        metadata: { email: "producer@stembridge.dev" },
        createdAt: minutesAgo(3300)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: { versionId: versionTwo.id, versionNumber: 2, createdById: users.vocalist.id },
        createdAt: minutesAgo(360)
      },
      {
        projectId: project.id,
        type: ActivityEventType.COMMENT_ADDED,
        metadata: { versionId: versionTwo.id, authorId: users.owner.id },
        createdAt: minutesAgo(320)
      }
    ]
  });

  return project;
};

const createMorningCircuitProject = async (users: SeedUserMap) => {
  const project = await prisma.project.create({
    data: {
      name: "Morning Circuit",
      bpm: 110,
      musicalKey: "F# Minor",
      ownerId: users.owner.id,
      createdAt: minutesAgo(940),
      updatedAt: minutesAgo(520)
    }
  });

  await prisma.projectMember.createMany({
    data: [{ projectId: project.id, userId: users.owner.id, joinedAt: minutesAgo(939) }]
  });

  const version = await prisma.songVersion.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      notes: "Solo writing session bounce with placeholder drums and bass.",
      createdById: users.owner.id,
      createdAt: minutesAgo(920)
    }
  });

  const storageKey = `seed-assets/${project.id}/${version.id}/writing-bounce.wav`;

  await prisma.fileAsset.create({
    data: {
      songVersionId: version.id,
      name: "writing-bounce.wav",
      originalName: "Morning Circuit Writing Bounce.wav",
      type: FileAssetType.MIX,
      mimeType: "audio/wav",
      sizeBytes: 10_648_221,
      storageKey,
      url: s3Url(storageKey),
      createdAt: minutesAgo(910)
    }
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        projectId: project.id,
        type: ActivityEventType.PROJECT_CREATED,
        metadata: { ownerId: users.owner.id, projectName: project.name },
        createdAt: minutesAgo(940)
      },
      {
        projectId: project.id,
        type: ActivityEventType.VERSION_CREATED,
        metadata: { versionId: version.id, versionNumber: 1, createdById: users.owner.id },
        createdAt: minutesAgo(920)
      },
      {
        projectId: project.id,
        type: ActivityEventType.FILE_UPLOADED,
        metadata: { versionId: version.id, fileCount: 1 },
        createdAt: minutesAgo(910)
      }
    ]
  });

  return project;
};

const createArchiveSketchesProject = async (users: SeedUserMap) => {
  const project = await prisma.project.create({
    data: {
      name: "Archive Sketches",
      ownerId: users.owner.id,
      createdAt: minutesAgo(11_200),
      updatedAt: minutesAgo(10_800)
    }
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: users.owner.id,
      joinedAt: minutesAgo(11_199)
    }
  });

  await prisma.activityEvent.create({
    data: {
      projectId: project.id,
      type: ActivityEventType.PROJECT_CREATED,
      metadata: { ownerId: users.owner.id, projectName: project.name },
      createdAt: minutesAgo(11_200)
    }
  });

  return project;
};

const main = async () => {
  const users = await seedUsers();
  await deleteExistingDemoProjects(users.owner.id);

  const projects = await Promise.all([
    createNeonSkylineProject(users),
    createHarborLightsProject(users),
    createMorningCircuitProject(users),
    createArchiveSketchesProject(users)
  ]);

  const [projectCount, versionCount, fileCount, commentCount, inviteCount, activityCount] =
    await Promise.all([
      prisma.project.count({
        where: {
          ownerId: users.owner.id,
          name: { in: [...DEMO_PROJECT_NAMES] }
        }
      }),
      prisma.songVersion.count({
        where: {
          project: {
            ownerId: users.owner.id,
            name: { in: [...DEMO_PROJECT_NAMES] }
          }
        }
      }),
      prisma.fileAsset.count({
        where: {
          songVersion: {
            project: {
              ownerId: users.owner.id,
              name: { in: [...DEMO_PROJECT_NAMES] }
            }
          }
        }
      }),
      prisma.comment.count({
        where: {
          songVersion: {
            project: {
              ownerId: users.owner.id,
              name: { in: [...DEMO_PROJECT_NAMES] }
            }
          }
        }
      }),
      prisma.invite.count({
        where: {
          project: {
            ownerId: users.owner.id,
            name: { in: [...DEMO_PROJECT_NAMES] }
          }
        }
      }),
      prisma.activityEvent.count({
        where: {
          project: {
            ownerId: users.owner.id,
            name: { in: [...DEMO_PROJECT_NAMES] }
          }
        }
      })
    ]);

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        demoPassword: DEMO_PASSWORD,
        users: [...DEMO_USERS],
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name
        })),
        counts: {
          projects: projectCount,
          songVersions: versionCount,
          fileAssets: fileCount,
          comments: commentCount,
          invites: inviteCount,
          activityEvents: activityCount
        }
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
