import type { Prisma } from "../../generated/prisma/client";
import { ActivityEventType } from "../../generated/prisma/client";
import {
  safeUserSelect,
  serializeSafeUser,
  type SafeUserRecord
} from "../../lib/serializers/safe-user";
import { prisma } from "../../lib/prisma";
import type { CreateCommentInput } from "./comment.schemas";

const commentSelect = {
  id: true,
  songVersionId: true,
  timestampSeconds: true,
  text: true,
  createdAt: true,
  user: {
    select: safeUserSelect
  }
} satisfies Prisma.CommentSelect;

const toComment = (comment: {
  id: string;
  songVersionId: string;
  timestampSeconds: Prisma.Decimal;
  text: string;
  createdAt: Date;
  user: SafeUserRecord;
}) => {
  return {
    id: comment.id,
    versionId: comment.songVersionId,
    timestampSeconds: comment.timestampSeconds.toNumber(),
    text: comment.text,
    createdAt: comment.createdAt,
    author: serializeSafeUser(comment.user)
  };
};

export const createComment = async (
  versionId: string,
  projectId: string,
  authorId: string,
  input: CreateCommentInput
) => {
  const comment = await prisma.$transaction(async (tx) => {
    const createdComment = await tx.comment.create({
      data: {
        songVersionId: versionId,
        userId: authorId,
        timestampSeconds: input.timestampSeconds,
        text: input.text.trim()
      },
      select: commentSelect
    });

    await tx.activityEvent.create({
      data: {
        projectId,
        type: ActivityEventType.COMMENT_ADDED,
        metadata: {
          commentId: createdComment.id,
          versionId,
          authorId,
          timestampSeconds: input.timestampSeconds
        }
      }
    });

    return createdComment;
  });

  return {
    comment: toComment(comment)
  };
};

export const listCommentsForVersion = async (versionId: string) => {
  const comments = await prisma.comment.findMany({
    where: {
      songVersionId: versionId
    },
    orderBy: [{ timestampSeconds: "asc" }, { createdAt: "asc" }],
    select: commentSelect
  });

  return {
    comments: comments.map(toComment)
  };
};

export const deleteCommentById = async (commentId: string) => {
  const deletedComment = await prisma.comment.delete({
    where: {
      id: commentId
    },
    select: {
      id: true
    }
  });

  return {
    deleted: true,
    commentId: deletedComment.id
  };
};
