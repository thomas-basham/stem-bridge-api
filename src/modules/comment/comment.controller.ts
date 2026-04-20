import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { createComment, deleteCommentById, listCommentsForVersion } from "./comment.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createComment(
    req.versionAccess!.versionId,
    req.versionAccess!.projectId,
    req.auth!.sub,
    req.body
  );
  res.status(201).json(result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listCommentsForVersion(req.versionAccess!.versionId);
  res.status(200).json(result);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteCommentById(req.commentAccess!.commentId);
  res.status(200).json(result);
});
