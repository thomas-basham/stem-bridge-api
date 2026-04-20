import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ensureCommentAuthor } from "../../middleware/comment-access.middleware";
import { ensureVersionMember } from "../../middleware/version-access.middleware";
import { validateBody, validateParams } from "../../middleware/validate";
import * as commentController from "./comment.controller";
import {
  commentParamsSchema,
  createCommentBodySchema,
  versionCommentParamsSchema
} from "./comment.schemas";

const versionCommentRouter = Router({ mergeParams: true });
const commentRouter = Router();

versionCommentRouter.use(authenticate);
versionCommentRouter.use(validateParams(versionCommentParamsSchema));
versionCommentRouter.use(ensureVersionMember);

versionCommentRouter.post("/", validateBody(createCommentBodySchema), commentController.create);
versionCommentRouter.get("/", commentController.list);

commentRouter.use(authenticate);
commentRouter.delete(
  "/:commentId",
  validateParams(commentParamsSchema),
  ensureCommentAuthor,
  commentController.remove
);

export { commentRouter, versionCommentRouter };
