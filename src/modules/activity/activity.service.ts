import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { ProjectActivityQueryInput } from "./activity.schemas";

const activityEventSelect = {
  id: true,
  type: true,
  metadata: true,
  createdAt: true
} satisfies Prisma.ActivityEventSelect;

export const listProjectActivity = async (projectId: string, query: ProjectActivityQueryInput) => {
  const skip = (query.page - 1) * query.pageSize;

  const [events, totalItems] = await prisma.$transaction([
    prisma.activityEvent.findMany({
      where: {
        projectId
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: query.pageSize,
      select: activityEventSelect
    }),
    prisma.activityEvent.count({
      where: {
        projectId
      }
    })
  ]);

  return {
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      metadata: event.metadata,
      createdAt: event.createdAt
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize)
    }
  };
};
