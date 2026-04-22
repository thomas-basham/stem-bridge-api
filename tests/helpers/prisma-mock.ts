import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { Prisma } from "../../src/generated/prisma/client";

import { vi } from "vitest";

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectRecord = {
  id: string;
  name: string;
  bpm: number | null;
  musicalKey: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectMemberRecord = {
  id: string;
  projectId: string;
  userId: string;
  joinedAt: Date;
};

type SongVersionRecord = {
  id: string;
  projectId: string;
  versionNumber: number;
  notes: string | null;
  createdById: string;
  createdAt: Date;
};

type FileAssetRecord = {
  id: string;
  songVersionId: string;
  name: string;
  originalName: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
  createdAt: Date;
};

type CommentRecord = {
  id: string;
  songVersionId: string;
  userId: string;
  timestampSeconds: Prisma.Decimal;
  text: string;
  createdAt: Date;
};

type ActivityEventRecord = {
  id: string;
  projectId: string;
  type: string;
  metadata: unknown;
  createdAt: Date;
};

type MockState = {
  users: UserRecord[];
  projects: ProjectRecord[];
  projectMembers: ProjectMemberRecord[];
  songVersions: SongVersionRecord[];
  fileAssets: FileAssetRecord[];
  comments: CommentRecord[];
  activityEvents: ActivityEventRecord[];
};

const state: MockState = {
  users: [],
  projects: [],
  projectMembers: [],
  songVersions: [],
  fileAssets: [],
  comments: [],
  activityEvents: []
};

const now = () => new Date();

const toSafeUser = (user: UserRecord) => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const sortByDateAscending = <T extends { createdAt: Date }>(records: T[]) => {
  return [...records].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
};

const findUserById = (userId: string) => {
  return state.users.find((user) => user.id === userId) ?? null;
};

const findProjectById = (projectId: string) => {
  return state.projects.find((project) => project.id === projectId) ?? null;
};

const isProjectMember = (projectId: string, userId: string) => {
  return state.projectMembers.some(
    (membership) => membership.projectId === projectId && membership.userId === userId
  );
};

const buildProjectSummary = (project: ProjectRecord) => {
  const owner = findUserById(project.ownerId);

  if (!owner) {
    throw new Error(`Owner ${project.ownerId} not found for project ${project.id}.`);
  }

  const memberCount = state.projectMembers.filter(
    (membership) => membership.projectId === project.id
  ).length;
  const versionCount = state.songVersions.filter(
    (version) => version.projectId === project.id
  ).length;

  return {
    id: project.id,
    name: project.name,
    bpm: project.bpm,
    musicalKey: project.musicalKey,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: toSafeUser(owner),
    _count: {
      members: memberCount,
      songVersions: versionCount
    }
  };
};

const buildLatestVersion = (projectId: string) => {
  const versions = state.songVersions
    .filter((version) => version.projectId === projectId)
    .sort((left, right) => {
      if (right.versionNumber !== left.versionNumber) {
        return right.versionNumber - left.versionNumber;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });

  const latestVersion = versions[0];

  if (!latestVersion) {
    return [];
  }

  const createdBy = findUserById(latestVersion.createdById);

  if (!createdBy) {
    throw new Error(`Version creator ${latestVersion.createdById} not found.`);
  }

  return [
    {
      id: latestVersion.id,
      versionNumber: latestVersion.versionNumber,
      notes: latestVersion.notes,
      createdAt: latestVersion.createdAt,
      createdBy: toSafeUser(createdBy),
      _count: {
        fileAssets: state.fileAssets.filter((asset) => asset.songVersionId === latestVersion.id)
          .length,
        comments: state.comments.filter((comment) => comment.songVersionId === latestVersion.id)
          .length
      }
    }
  ];
};

const buildProjectDetail = (project: ProjectRecord) => {
  const owner = findUserById(project.ownerId);

  if (!owner) {
    throw new Error(`Owner ${project.ownerId} not found for project ${project.id}.`);
  }

  const members = state.projectMembers
    .filter((membership) => membership.projectId === project.id)
    .sort((left, right) => left.joinedAt.getTime() - right.joinedAt.getTime())
    .map((membership) => {
      const user = findUserById(membership.userId);

      if (!user) {
        throw new Error(`Member user ${membership.userId} not found.`);
      }

      return {
        id: membership.id,
        joinedAt: membership.joinedAt,
        user: toSafeUser(user)
      };
    });

  return {
    id: project.id,
    name: project.name,
    bpm: project.bpm,
    musicalKey: project.musicalKey,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: toSafeUser(owner),
    members,
    songVersions: buildLatestVersion(project.id),
    _count: {
      members: members.length,
      songVersions: state.songVersions.filter((version) => version.projectId === project.id).length
    }
  };
};

const buildVersionDetail = (version: SongVersionRecord) => {
  const createdBy = findUserById(version.createdById);

  if (!createdBy) {
    throw new Error(`Version creator ${version.createdById} not found.`);
  }

  const fileAssets = sortByDateAscending(
    state.fileAssets.filter((fileAsset) => fileAsset.songVersionId === version.id)
  );
  const comments = sortByDateAscending(
    state.comments.filter((comment) => comment.songVersionId === version.id)
  ).sort((left, right) => {
    const timestampComparison = left.timestampSeconds.comparedTo(right.timestampSeconds);

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  return {
    id: version.id,
    projectId: version.projectId,
    versionNumber: version.versionNumber,
    notes: version.notes,
    createdAt: version.createdAt,
    createdBy: toSafeUser(createdBy),
    fileAssets: fileAssets.map((fileAsset) => ({
      id: fileAsset.id,
      name: fileAsset.name,
      originalName: fileAsset.originalName,
      type: fileAsset.type,
      mimeType: fileAsset.mimeType,
      sizeBytes: fileAsset.sizeBytes,
      storageKey: fileAsset.storageKey,
      url: fileAsset.url,
      createdAt: fileAsset.createdAt
    })),
    comments: comments.map((comment) => {
      const user = findUserById(comment.userId);

      if (!user) {
        throw new Error(`Comment user ${comment.userId} not found.`);
      }

      return {
        id: comment.id,
        timestampSeconds: comment.timestampSeconds,
        text: comment.text,
        createdAt: comment.createdAt,
        user: toSafeUser(user)
      };
    })
  };
};

const clearState = () => {
  state.users = [];
  state.projects = [];
  state.projectMembers = [];
  state.songVersions = [];
  state.fileAssets = [];
  state.comments = [];
  state.activityEvents = [];
};

const userFindUnique = vi.fn(
  async ({
    where,
    select
  }: {
    where: { id?: string; email?: string };
    select?: Record<string, boolean>;
  }) => {
    const user =
      where.id !== undefined
        ? state.users.find((record) => record.id === where.id)
        : state.users.find((record) => record.email === where.email);

    if (!user) {
      return null;
    }

    if (!select) {
      return user;
    }

    return {
      ...(select.id ? { id: user.id } : {}),
      ...(select.email ? { email: user.email } : {}),
      ...(select.passwordHash ? { passwordHash: user.passwordHash } : {}),
      ...(select.createdAt ? { createdAt: user.createdAt } : {}),
      ...(select.updatedAt ? { updatedAt: user.updatedAt } : {})
    };
  }
);

const userCreate = vi.fn(
  async ({
    data,
    select
  }: {
    data: { email: string; passwordHash: string };
    select?: Record<string, boolean>;
  }) => {
    const user: UserRecord = {
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: now(),
      updatedAt: now()
    };

    state.users.push(user);

    if (!select) {
      return user;
    }

    return {
      ...(select.id ? { id: user.id } : {}),
      ...(select.email ? { email: user.email } : {}),
      ...(select.passwordHash ? { passwordHash: user.passwordHash } : {}),
      ...(select.createdAt ? { createdAt: user.createdAt } : {}),
      ...(select.updatedAt ? { updatedAt: user.updatedAt } : {})
    };
  }
);

const projectCreate = vi.fn(
  async ({
    data
  }: {
    data: {
      name: string;
      bpm?: number;
      musicalKey?: string;
      ownerId: string;
      members?: { create: { userId: string } };
    };
    select?: Record<string, boolean>;
  }) => {
    const project: ProjectRecord = {
      id: randomUUID(),
      name: data.name,
      bpm: data.bpm ?? null,
      musicalKey: data.musicalKey ?? null,
      ownerId: data.ownerId,
      createdAt: now(),
      updatedAt: now()
    };

    state.projects.push(project);

    if (data.members?.create.userId) {
      state.projectMembers.push({
        id: randomUUID(),
        projectId: project.id,
        userId: data.members.create.userId,
        joinedAt: now()
      });
    }

    return { id: project.id };
  }
);

const projectFindMany = vi.fn(
  async ({ where }: { where?: { members?: { some?: { userId?: string } } } }) => {
    const userId = where?.members?.some?.userId;
    const projects = userId
      ? state.projects.filter((project) => isProjectMember(project.id, userId))
      : state.projects;

    return projects
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map(buildProjectSummary);
  }
);

const projectFindUnique = vi.fn(async ({ where }: { where: { id: string } }) => {
  const project = findProjectById(where.id);

  if (!project) {
    return null;
  }

  return buildProjectDetail(project);
});

const projectMemberFindUnique = vi.fn(
  async ({ where }: { where: { projectId_userId: { projectId: string; userId: string } } }) => {
    const membership = state.projectMembers.find(
      (record) =>
        record.projectId === where.projectId_userId.projectId &&
        record.userId === where.projectId_userId.userId
    );

    if (!membership) {
      return null;
    }

    const project = findProjectById(membership.projectId);

    if (!project) {
      throw new Error(`Project ${membership.projectId} not found.`);
    }

    return {
      id: membership.id,
      project: {
        id: project.id,
        ownerId: project.ownerId
      }
    };
  }
);

const songVersionFindFirst = vi.fn(
  async ({
    where
  }: {
    where?: {
      projectId?: string;
      id?: string;
      project?: { members?: { some?: { userId?: string } } };
    };
  }) => {
    if (where?.projectId) {
      const versions = state.songVersions
        .filter((version) => version.projectId === where.projectId)
        .sort((left, right) => right.versionNumber - left.versionNumber);

      const latestVersion = versions[0];

      return latestVersion ? { versionNumber: latestVersion.versionNumber } : null;
    }

    if (where?.id) {
      const version = state.songVersions.find((record) => record.id === where.id);

      if (!version) {
        return null;
      }

      const userId = where.project?.members?.some?.userId;

      if (userId && !isProjectMember(version.projectId, userId)) {
        return null;
      }

      return {
        id: version.id,
        projectId: version.projectId,
        createdById: version.createdById,
        versionNumber: version.versionNumber
      };
    }

    return null;
  }
);

const songVersionCreate = vi.fn(
  async ({
    data
  }: {
    data: {
      projectId: string;
      versionNumber: number;
      notes?: string;
      createdById: string;
      createdAt?: Date;
    };
    select?: Record<string, boolean>;
  }) => {
    const version: SongVersionRecord = {
      id: randomUUID(),
      projectId: data.projectId,
      versionNumber: data.versionNumber,
      notes: data.notes ?? null,
      createdById: data.createdById,
      createdAt: data.createdAt ?? now()
    };

    state.songVersions.push(version);

    return {
      id: version.id
    };
  }
);

const songVersionFindUnique = vi.fn(async ({ where }: { where: { id: string } }) => {
  const version = state.songVersions.find((record) => record.id === where.id);

  if (!version) {
    return null;
  }

  return buildVersionDetail(version);
});

const commentCreate = vi.fn(
  async ({
    data
  }: {
    data: {
      songVersionId: string;
      userId: string;
      timestampSeconds: number;
      text: string;
    };
  }) => {
    const comment: CommentRecord = {
      id: randomUUID(),
      songVersionId: data.songVersionId,
      userId: data.userId,
      timestampSeconds: new Prisma.Decimal(data.timestampSeconds),
      text: data.text,
      createdAt: now()
    };

    state.comments.push(comment);

    const user = findUserById(comment.userId);

    if (!user) {
      throw new Error(`Comment user ${comment.userId} not found.`);
    }

    return {
      id: comment.id,
      songVersionId: comment.songVersionId,
      timestampSeconds: comment.timestampSeconds,
      text: comment.text,
      createdAt: comment.createdAt,
      user: toSafeUser(user)
    };
  }
);

const activityEventCreate = vi.fn(
  async ({
    data
  }: {
    data: {
      projectId: string;
      type: string;
      metadata: unknown;
      createdAt?: Date;
    };
  }) => {
    const activityEvent: ActivityEventRecord = {
      id: randomUUID(),
      projectId: data.projectId,
      type: data.type,
      metadata: data.metadata,
      createdAt: data.createdAt ?? now()
    };

    state.activityEvents.push(activityEvent);

    return activityEvent;
  }
);

type PrismaMock = {
  user: {
    findUnique: typeof userFindUnique;
    create: typeof userCreate;
  };
  project: {
    create: typeof projectCreate;
    findMany: typeof projectFindMany;
    findUnique: typeof projectFindUnique;
  };
  projectMember: {
    findUnique: typeof projectMemberFindUnique;
  };
  songVersion: {
    findFirst: typeof songVersionFindFirst;
    create: typeof songVersionCreate;
    findUnique: typeof songVersionFindUnique;
  };
  comment: {
    create: typeof commentCreate;
  };
  activityEvent: {
    create: typeof activityEventCreate;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

export const prismaMock = {} as PrismaMock;

prismaMock.user = {
  findUnique: userFindUnique,
  create: userCreate
};

prismaMock.project = {
  create: projectCreate,
  findMany: projectFindMany,
  findUnique: projectFindUnique
};

prismaMock.projectMember = {
  findUnique: projectMemberFindUnique
};

prismaMock.songVersion = {
  findFirst: songVersionFindFirst,
  create: songVersionCreate,
  findUnique: songVersionFindUnique
};

prismaMock.comment = {
  create: commentCreate
};

prismaMock.activityEvent = {
  create: activityEventCreate
};

prismaMock.$transaction = vi.fn(async (transaction: unknown) => {
  if (typeof transaction === "function") {
    return transaction(prismaMock);
  }

  if (Array.isArray(transaction)) {
    return Promise.all(transaction);
  }

  throw new Error("Unsupported transaction shape in Prisma mock.");
});

export const resetPrismaMock = () => {
  clearState();
  vi.clearAllMocks();
};

export const seedUser = async (input?: { email?: string; password?: string }) => {
  const email = input?.email ?? `user-${randomUUID()}@stembridge.dev`;
  const password = input?.password ?? "Password123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const user: UserRecord = {
    id: randomUUID(),
    email,
    passwordHash,
    createdAt: now(),
    updatedAt: now()
  };

  state.users.push(user);

  return {
    ...user,
    password
  };
};

export const seedProject = (input: {
  ownerId: string;
  name?: string;
  bpm?: number;
  musicalKey?: string;
  memberUserIds?: string[];
}) => {
  const project: ProjectRecord = {
    id: randomUUID(),
    name: input.name ?? "Test Project",
    bpm: input.bpm ?? 128,
    musicalKey: input.musicalKey ?? "A Minor",
    ownerId: input.ownerId,
    createdAt: now(),
    updatedAt: now()
  };

  state.projects.push(project);

  const memberUserIds = input.memberUserIds ?? [input.ownerId];

  for (const userId of memberUserIds) {
    state.projectMembers.push({
      id: randomUUID(),
      projectId: project.id,
      userId,
      joinedAt: now()
    });
  }

  return project;
};

export const seedSongVersion = (input: {
  projectId: string;
  createdById: string;
  versionNumber?: number;
  notes?: string;
}) => {
  const version: SongVersionRecord = {
    id: randomUUID(),
    projectId: input.projectId,
    versionNumber: input.versionNumber ?? 1,
    notes: input.notes ?? "Initial version",
    createdById: input.createdById,
    createdAt: now()
  };

  state.songVersions.push(version);

  return version;
};
