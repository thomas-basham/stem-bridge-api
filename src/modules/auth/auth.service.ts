import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/app-error";
import { signJwt } from "../../utils/jwt";
import type { LoginInput, RegisterInput } from "./auth.schemas";

const PASSWORD_SALT_ROUNDS = 12;

const safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
} as const;

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

const buildAuthResponse = (user: SafeUserRecord) => {
  const safeUser = toSafeUser(user);

  return {
    token: signJwt({
      sub: safeUser.id,
      email: safeUser.email
    }),
    user: safeUser
  };
};

export const registerUser = async (input: RegisterInput) => {
  const email = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash
    },
    select: safeUserSelect
  });

  return buildAuthResponse(user);
};

export const loginUser = async (input: LoginInput) => {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...safeUserSelect,
      passwordHash: true
    }
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password.");
  }

  return buildAuthResponse(user);
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect
  });

  if (!user) {
    throw new AppError(404, "Authenticated user not found.");
  }

  return {
    user: toSafeUser(user)
  };
};
