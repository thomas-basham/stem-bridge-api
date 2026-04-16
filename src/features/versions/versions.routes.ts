import { Router } from "express";

import { validate } from "../../middleware/validate";
import * as versionsController from "./versions.controller";
import {
  completeVersionFileUploadSchema,
  createVersionCommentSchema,
  createVersionSchema,
  listProjectVersionsSchema,
  versionIdSchema
} from "./versions.schemas";

const projectVersionsRouter = Router({ mergeParams: true });
const versionsRouter = Router();

projectVersionsRouter.get(
  "/",
  validate(listProjectVersionsSchema),
  versionsController.listProjectVersions
);
projectVersionsRouter.post(
  "/",
  validate(createVersionSchema),
  versionsController.createProjectVersion
);

versionsRouter.get("/:versionId", validate(versionIdSchema), versionsController.getVersion);
versionsRouter.get(
  "/:versionId/comments",
  validate(versionIdSchema),
  versionsController.getVersionComments
);
versionsRouter.post(
  "/:versionId/comments",
  validate(createVersionCommentSchema),
  versionsController.createVersionComment
);
versionsRouter.post(
  "/:versionId/files/:fileId/complete",
  validate(completeVersionFileUploadSchema),
  versionsController.completeVersionFileUpload
);
versionsRouter.get(
  "/:versionId/download",
  validate(versionIdSchema),
  versionsController.downloadVersion
);

export { projectVersionsRouter, versionsRouter };

