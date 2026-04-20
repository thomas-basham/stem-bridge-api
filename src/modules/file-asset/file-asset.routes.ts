import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import { ensureVersionMember } from "../../middleware/version-access.middleware";
import { validateBody, validateParams } from "../../middleware/validate";
import * as fileAssetController from "./file-asset.controller";
import { createFileAssetMetadataBodySchema, versionFileParamsSchema } from "./file-asset.schemas";

const versionFileAssetRouter = Router({ mergeParams: true });

versionFileAssetRouter.use(authenticate);
versionFileAssetRouter.use(validateParams(versionFileParamsSchema));
versionFileAssetRouter.use(ensureVersionMember);

versionFileAssetRouter.post(
  "/metadata",
  validateBody(createFileAssetMetadataBodySchema),
  fileAssetController.createMetadata
);
versionFileAssetRouter.get("/", fileAssetController.list);

export { versionFileAssetRouter };
