import bcrypt from "bcryptjs";

const PASSWORD_ROUNDS = 12;

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
};

export const comparePassword = async (password: string, passwordHash: string) => {
  return bcrypt.compare(password, passwordHash);
};

