import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ensureProjectMember } from "../../middleware/project-access.middleware";
import { validateBody, validateParams } from "../../middleware/validate";
import * as inviteController from "./invite.controller";
import {
  createInviteBodySchema,
  inviteTokenParamsSchema,
  projectInviteParamsSchema
} from "./invite.schemas";

const projectInviteRouter = Router({ mergeParams: true });
const inviteRouter = Router();

projectInviteRouter.use(authenticate);
projectInviteRouter.use(validateParams(projectInviteParamsSchema));
projectInviteRouter.use(ensureProjectMember);

projectInviteRouter.post("/", validateBody(createInviteBodySchema), inviteController.create);
projectInviteRouter.get("/", inviteController.listPending);

inviteRouter.use(authenticate);
inviteRouter.post(
  "/:token/accept",
  validateParams(inviteTokenParamsSchema),
  inviteController.accept
);

export { inviteRouter, projectInviteRouter };
