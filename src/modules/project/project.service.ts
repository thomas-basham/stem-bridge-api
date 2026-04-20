import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/app-error";
import type { CreateProjectInput } from "./project.schemas";

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

const toSafeUser = (user: SafeUserRecord) => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const latestVersionSelect = {
  id: true,
  versionNumber: true,
  notes: true,
  createdAt: true,
  createdBy: {
    select: safeUserSelect
  },
  _count: {
    select: {
      fileAssets: true,
      comments: true
    }
  }
} satisfies Prisma.SongVersionSelect;

const projectListSelect = {
  id: true,
  name: true,
  bpm: true,
  musicalKey: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: safeUserSelect
  },
  _count: {
    select: {
      members: true,
      songVersions: true
    }
  }
} satisfies Prisma.ProjectSelect;

const projectDetailSelect = {
  id: true,
  name: true,
  bpm: true,
  musicalKey: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: safeUserSelect
  },
  members: {
    orderBy: {
      joinedAt: "asc"
    },
    select: {
      id: true,
      joinedAt: true,
      user: {
        select: safeUserSelect
      }
    }
  },
  songVersions: {
    take: 1,
    orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
    select: latestVersionSelect
  },
  _count: {
    select: {
      members: true,
      songVersions: true
    }
  }
} satisfies Prisma.ProjectSelect;

const toLatestVersion = (
  version:
    | {
        id: string;
        versionNumber: number;
        notes: string | null;
        createdAt: Date;
        createdBy: SafeUserRecord;
        _count: {
          fileAssets: number;
          comments: number;
        };
      }
    | undefined
) => {
  if (!version) {
    return null;
  }

  return {
    id: version.id,
    versionNumber: version.versionNumber,
    notes: version.notes,
    createdAt: version.createdAt,
    createdBy: toSafeUser(version.createdBy),
    fileAssetCount: version._count.fileAssets,
    commentCount: version._count.comments
  };
};

const getProjectRecord = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: projectDetailSelect
  });

  if (!project) {
    throw new AppError(404, "Project not found.");
  }

  return project;
};

export const createProject = async (userId: string, input: CreateProjectInput) => {
  const project = await prisma.project.create({
    data: {
      name: input.name.trim(),
      bpm: input.bpm,
      musicalKey: input.musicalKey,
      ownerId: userId,
      members: {
        create: {
          userId
        }
      }
    },
    select: {
      id: true
    }
  });

  return getProjectById(project.id);
};

export const getProjectsForUser = async (userId: string) => {
  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: projectListSelect
  });

  return {
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      bpm: project.bpm,
      musicalKey: project.musicalKey,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: toSafeUser(project.owner),
      collaboratorCount: project._count.members,
      versionCount: project._count.songVersions
    }))
  };
};

export const getProjectById = async (projectId: string) => {
  const project = await getProjectRecord(projectId);

  return {
    project: {
      id: project.id,
      name: project.name,
      bpm: project.bpm,
      musicalKey: project.musicalKey,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: toSafeUser(project.owner),
      collaboratorCount: project._count.members,
      versionCount: project._count.songVersions,
      collaborators: project.members.map((member) => ({
        id: member.id,
        joinedAt: member.joinedAt,
        user: toSafeUser(member.user)
      })),
      latestVersion: toLatestVersion(project.songVersions[0])
    }
  };
};
