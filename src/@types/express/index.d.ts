import type { CommentAccessContext } from "../../middleware/comment-access.middleware";
import type { ProjectAccessContext } from "../../middleware/project-access.middleware";
import type { VersionAccessContext } from "../../middleware/version-access.middleware";
import type { AuthTokenPayload } from "../../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      commentAccess?: CommentAccessContext;
      projectAccess?: ProjectAccessContext;
      versionAccess?: VersionAccessContext;
    }
  }
}

export {};
