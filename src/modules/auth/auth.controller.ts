import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { getCurrentUser, loginUser, registerUser } from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  sendSuccess(res, 201, "Registration successful", result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  sendSuccess(res, 200, "Login successful", result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await getCurrentUser(req.auth!.sub);
  sendSuccess(res, 200, "Current user retrieved successfully", result);
});
