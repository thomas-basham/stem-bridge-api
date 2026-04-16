import { Router } from "express";

import { validate } from "../../middleware/validate";
import * as projectsController from "./projects.controller";
import {
  acceptInvitationSchema,
  createProjectSchema,
  inviteCollaboratorSchema,
  projectIdSchema
} from "./projects.schemas";

const projectsRouter = Router();

projectsRouter.get("/", projectsController.listProjects);
projectsRouter.post("/", validate(createProjectSchema), projectsController.createProjectHandler);
projectsRouter.get("/:projectId", validate(projectIdSchema), projectsController.getProject);
projectsRouter.post(
  "/:projectId/invitations",
  validate(inviteCollaboratorSchema),
  projectsController.inviteProjectCollaborator
);
projectsRouter.post(
  "/invitations/:token/accept",
  validate(acceptInvitationSchema),
  projectsController.acceptProjectInvitation
);

export { projectsRouter };

