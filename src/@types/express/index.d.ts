import type { ProjectAccessContext } from "../../middleware/project-access.middleware";
import type { AuthTokenPayload } from "../../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      projectAccess?: ProjectAccessContext;
    }
  }
}

export {};
