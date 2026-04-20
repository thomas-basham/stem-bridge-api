import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { createComment, deleteCommentById, listCommentsForVersion } from "./comment.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createComment(
    req.versionAccess!.versionId,
    req.versionAccess!.projectId,
    req.auth!.sub,
    req.body
  );
  sendSuccess(res, 201, "Comment created successfully", result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listCommentsForVersion(req.versionAccess!.versionId);
  sendSuccess(res, 200, "Comments retrieved successfully", result);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteCommentById(req.commentAccess!.commentId);
  sendSuccess(res, 200, "Comment deleted successfully", result);
});
