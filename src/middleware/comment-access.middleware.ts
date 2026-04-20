import type { Request } from "express";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

export type CommentAccessContext = {
  commentId: string;
  versionId: string;
  projectId: string;
  authorId: string;
};

const getCommentIdFromRequest = (req: Request) => {
  const commentId = req.params.commentId;

  if (typeof commentId !== "string" || commentId.length === 0) {
    throw new AppError(400, "Comment id route parameter is required.");
  }

  return commentId;
};

const resolveCommentAccess = async (req: Request): Promise<CommentAccessContext> => {
  const authenticatedUserId = req.auth?.sub;

  if (!authenticatedUserId) {
    throw new AppError(401, "Authentication is required.");
  }

  const commentId = getCommentIdFromRequest(req);

  if (req.commentAccess?.commentId === commentId) {
    return req.commentAccess;
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      songVersion: {
        project: {
          members: {
            some: {
              userId: authenticatedUserId
            }
          }
        }
      }
    },
    select: {
      id: true,
      userId: true,
      songVersionId: true,
      songVersion: {
        select: {
          projectId: true
        }
      }
    }
  });

  if (!comment) {
    throw new AppError(404, "Comment not found.");
  }

  const commentAccess = {
    commentId: comment.id,
    versionId: comment.songVersionId,
    projectId: comment.songVersion.projectId,
    authorId: comment.userId
  };

  req.commentAccess = commentAccess;

  return commentAccess;
};

export const ensureCommentMember = asyncHandler(async (req, _res, next) => {
  await resolveCommentAccess(req);
  next();
});

export const ensureCommentAuthor = asyncHandler(async (req, _res, next) => {
  const commentAccess = await resolveCommentAccess(req);

  if (commentAccess.authorId !== req.auth!.sub) {
    throw new AppError(403, "You can only delete your own comments.");
  }

  next();
});
