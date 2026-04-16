import { PrismaClient, ProjectRole } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const DEMO_PROJECT_NAME = "StemBridge Demo Session";
const prisma = new PrismaClient();

const seed = async () => {
  const ownerPasswordHash = await hashPassword("Password123!");
  const collaboratorPasswordHash = await hashPassword("Password123!");

  const owner = await prisma.user.upsert({
    where: { email: "owner@stembridge.dev" },
    update: {
      displayName: "Owner Demo",
      passwordHash: ownerPasswordHash
    },
    create: {
      email: "owner@stembridge.dev",
      displayName: "Owner Demo",
      passwordHash: ownerPasswordHash
    }
  });

  const collaborator = await prisma.user.upsert({
    where: { email: "collaborator@stembridge.dev" },
    update: {
      displayName: "Collaborator Demo",
      passwordHash: collaboratorPasswordHash
    },
    create: {
      email: "collaborator@stembridge.dev",
      displayName: "Collaborator Demo",
      passwordHash: collaboratorPasswordHash
    }
  });

  let project = await prisma.project.findFirst({
    where: {
      name: DEMO_PROJECT_NAME,
      ownerId: owner.id
    }
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: DEMO_PROJECT_NAME,
        description: "Sample workspace for testing project membership, versions, and comments.",
        ownerId: owner.id
      }
    });
  }

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: owner.id
      }
    },
    update: {
      role: ProjectRole.OWNER
    },
    create: {
      projectId: project.id,
      userId: owner.id,
      role: ProjectRole.OWNER
    }
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: collaborator.id
      }
    },
    update: {
      role: ProjectRole.EDITOR
    },
    create: {
      projectId: project.id,
      userId: collaborator.id,
      role: ProjectRole.EDITOR,
      invitedById: owner.id
    }
  });

  console.log("Seed complete.");
  console.log("owner@stembridge.dev / Password123!");
  console.log("collaborator@stembridge.dev / Password123!");
};

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
