import { prisma } from "../../database/prisma";
import { comparePassword, hashPassword } from "../../lib/auth/password";
import { generateOpaqueToken, hashToken, signAccessToken } from "../../lib/auth/jwt";
import { ApiError } from "../../lib/errors/api-error";
import { env } from "../../config/env";
import type { LoginInput, RefreshInput, RegisterInput } from "./auth.schemas";

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
};

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true
} as const;

const serializeUser = (user: PublicUser) => {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
};

const issueTokensForUser = async (user: PublicUser) => {
  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt
    }
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    displayName: user.displayName
  });

  return {
    user: serializeUser(user),
    auth: {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshTokenExpiresAt
    }
  };
};

export const registerUser = async (input: RegisterInput) => {
  const email = input.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const user = await prisma.user.create({
    data: {
      email,
      displayName: input.displayName.trim(),
      passwordHash: await hashPassword(input.password)
    },
    select: publicUserSelect
  });

  return issueTokensForUser(user);
};

export const loginUser = async (input: LoginInput) => {
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...publicUserSelect,
      passwordHash: true
    }
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password.");
  }

  return issueTokensForUser(user);
};

export const refreshSession = async (input: RefreshInput) => {
  const tokenHash = hashToken(input.refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: publicUserSelect
      }
    }
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
    throw new ApiError(401, "Refresh token is invalid or expired.");
  }

  const nextRefreshToken = generateOpaqueToken();
  const nextRefreshTokenExpiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() }
    }),
    prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: nextRefreshTokenExpiresAt
      }
    })
  ]);

  return {
    user: serializeUser(storedToken.user),
    auth: {
      tokenType: "Bearer",
      accessToken: signAccessToken({
        sub: storedToken.user.id,
        email: storedToken.user.email,
        displayName: storedToken.user.displayName
      }),
      refreshToken: nextRefreshToken,
      accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshTokenExpiresAt: nextRefreshTokenExpiresAt
    }
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return {
    user: serializeUser(user)
  };
};

