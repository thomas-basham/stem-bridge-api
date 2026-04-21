import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ensureProjectMember } from "../../middleware/project-access.middleware";
import { ensureVersionMember } from "../../middleware/version-access.middleware";
import { validateBody, validateParams } from "../../middleware/validate";
import * as versionController from "./version.controller";
import {
  createVersionBodySchema,
  projectVersionParamsSchema,
  versionParamsSchema
} from "./version.schemas";

const projectVersionRouter = Router({ mergeParams: true });
const versionRouter = Router();

projectVersionRouter.use(authenticate);
projectVersionRouter.use(validateParams(projectVersionParamsSchema));
projectVersionRouter.use(ensureProjectMember);

projectVersionRouter.post("/", validateBody(createVersionBodySchema), versionController.create);
projectVersionRouter.get("/", versionController.list);

versionRouter.use(authenticate);
versionRouter.get(
  "/:versionId/download",
  validateParams(versionParamsSchema),
  ensureVersionMember,
  versionController.download
);
versionRouter.get(
  "/:versionId",
  validateParams(versionParamsSchema),
  ensureVersionMember,
  versionController.getById
);

export { projectVersionRouter, versionRouter };
