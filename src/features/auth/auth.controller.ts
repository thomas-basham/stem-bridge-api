import type { Request, Response } from "express";

import { asyncHandler } from "../../lib/http/async-handler";
import { getCurrentUser, loginUser, refreshSession, registerUser } from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  res.status(200).json(result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await refreshSession(req.body);
  res.status(200).json(result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await getCurrentUser(req.user!.sub);
  res.status(200).json(result);
});

