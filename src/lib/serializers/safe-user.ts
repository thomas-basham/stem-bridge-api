import type { Prisma } from "../../generated/prisma/client";

export const safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export type SafeUserRecord = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export const serializeSafeUser = (user: SafeUserRecord) => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};
