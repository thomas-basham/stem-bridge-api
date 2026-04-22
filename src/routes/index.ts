import type { Express, Router } from "express";

import { projectActivityRouter } from "../modules/activity/activity.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { commentRouter, versionCommentRouter } from "../modules/comment/comment.routes";
import { versionFileAssetRouter } from "../modules/file-asset/file-asset.routes";
import { healthRouter } from "../modules/health/health.routes";
import { inviteRouter, projectInviteRouter } from "../modules/invite/invite.routes";
import { projectRouter } from "../modules/project/project.routes";
import { projectVersionRouter, versionRouter } from "../modules/version/version.routes";

type RouteRegistration = {
  path: string;
  router: Router;
};

const appRoutes: RouteRegistration[] = [
  { path: "/auth", router: authRouter },
  { path: "/comments", router: commentRouter },
  { path: "/health", router: healthRouter },
  { path: "/invites", router: inviteRouter },
  { path: "/projects/:projectId/activity", router: projectActivityRouter },
  { path: "/projects/:projectId/invites", router: projectInviteRouter },
  { path: "/projects/:projectId/versions", router: projectVersionRouter },
  { path: "/projects", router: projectRouter },
  { path: "/versions/:versionId/comments", router: versionCommentRouter },
  { path: "/versions/:versionId/files", router: versionFileAssetRouter },
  { path: "/versions", router: versionRouter }
];

export const registerAppRoutes = (app: Express) => {
  for (const route of appRoutes) {
    app.use(route.path, route.router);
  }
};
