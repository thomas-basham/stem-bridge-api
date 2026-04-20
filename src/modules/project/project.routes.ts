import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ensureProjectMember } from "../../middleware/project-access.middleware";
import { validateBody, validateParams } from "../../middleware/validate";
import * as projectController from "./project.controller";
import { createProjectBodySchema, projectParamsSchema } from "./project.schemas";

const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter.post("/", validateBody(createProjectBodySchema), projectController.create);
projectRouter.get("/", projectController.list);
projectRouter.get(
  "/:projectId",
  validateParams(projectParamsSchema),
  ensureProjectMember,
  projectController.getById
);

export { projectRouter };
