import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ensureProjectMember } from "../../middleware/project-access.middleware";
import { validateParams, validateQuery } from "../../middleware/validate";
import * as activityController from "./activity.controller";
import { projectActivityParamsSchema, projectActivityQuerySchema } from "./activity.schemas";

const projectActivityRouter = Router({ mergeParams: true });

projectActivityRouter.use(authenticate);
projectActivityRouter.use(validateParams(projectActivityParamsSchema));
projectActivityRouter.use(ensureProjectMember);

projectActivityRouter.get("/", validateQuery(projectActivityQuerySchema), activityController.list);

export { projectActivityRouter };
