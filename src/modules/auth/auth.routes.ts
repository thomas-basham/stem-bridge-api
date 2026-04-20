import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate";
import * as authController from "./auth.controller";
import { loginBodySchema, registerBodySchema } from "./auth.schemas";

const authRouter = Router();

authRouter.post("/register", validateBody(registerBodySchema), authController.register);
authRouter.post("/login", validateBody(loginBodySchema), authController.login);
authRouter.get("/me", authenticate, authController.me);

export { authRouter };
