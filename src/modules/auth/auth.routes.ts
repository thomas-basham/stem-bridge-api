import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { authRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../middleware/validate";
import * as authController from "./auth.controller";
import { loginBodySchema, registerBodySchema } from "./auth.schemas";

const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateBody(registerBodySchema),
  authController.register
);
authRouter.post("/login", authRateLimiter, validateBody(loginBodySchema), authController.login);
authRouter.get("/me", authenticate, authController.me);

export { authRouter };
