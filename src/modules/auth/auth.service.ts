import bcrypt from "bcryptjs";

import {
  safeUserSelect,
  serializeSafeUser,
  type SafeUserRecord
} from "../../lib/serializers/safe-user";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/app-error";
import { signJwt } from "../../utils/jwt";
import type { LoginInput, RegisterInput } from "./auth.schemas";

const PASSWORD_SALT_ROUNDS = 12;

const buildAuthResponse = (user: SafeUserRecord) => {
  const safeUser = serializeSafeUser(user);

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
    user: serializeSafeUser(user)
  };
};
