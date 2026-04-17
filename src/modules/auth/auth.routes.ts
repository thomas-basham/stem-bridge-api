import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate";
import * as authController from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schemas";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.get("/me", authenticate, authController.me);

export { authRouter };
