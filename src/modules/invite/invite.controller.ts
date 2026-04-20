import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import type { InviteTokenParamsInput } from "./invite.schemas";
import { acceptInvite, createInvite, listPendingInvites } from "./invite.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createInvite(req.projectAccess!.projectId, req.auth!.sub, req.body);
  sendSuccess(res, 201, "Invite created successfully", result);
});

export const listPending = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPendingInvites(req.projectAccess!.projectId);
  sendSuccess(res, 200, "Pending invites retrieved successfully", result);
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params as InviteTokenParamsInput;
  const result = await acceptInvite(token, req.auth!.sub, req.auth!.email);
  sendSuccess(res, 200, "Invite accepted successfully", result);
});
