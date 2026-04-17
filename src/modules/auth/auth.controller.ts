import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { getCurrentUser, loginUser, registerUser } from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  res.status(200).json(result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await getCurrentUser(req.auth!.sub);
  res.status(200).json(result);
});
