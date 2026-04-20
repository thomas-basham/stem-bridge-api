import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import type { InviteTokenParamsInput } from "./invite.schemas";
import { acceptInvite, createInvite, listPendingInvites } from "./invite.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createInvite(req.projectAccess!.projectId, req.auth!.sub, req.body);
  res.status(201).json(result);
});

export const listPending = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPendingInvites(req.projectAccess!.projectId);
  res.status(200).json(result);
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params as InviteTokenParamsInput;
  const result = await acceptInvite(token, req.auth!.sub, req.auth!.email);
  res.status(200).json(result);
});
