import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import type { ProjectActivityQueryInput } from "./activity.schemas";
import { listProjectActivity } from "./activity.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listProjectActivity(
    req.projectAccess!.projectId,
    req.query as unknown as ProjectActivityQueryInput
  );
  res.status(200).json(result);
});
