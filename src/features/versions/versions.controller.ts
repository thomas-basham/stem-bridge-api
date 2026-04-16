import archiver from "archiver";
import type { Request, Response } from "express";

import { asyncHandler } from "../../lib/http/async-handler";
import { getStoredObjectStream, sanitizeFileName } from "../../lib/storage/s3";
import {
  createComment,
  createVersion,
  getVersionById,
  getVersionDownloadBundle,
  listComments,
  listVersionsForProject,
  markFileUploadComplete
} from "./versions.service";

export const listProjectVersions = asyncHandler(async (req: Request, res: Response) => {
  const result = await listVersionsForProject(req.user!.sub, req.params.projectId);
  res.status(200).json(result);
});

export const createProjectVersion = asyncHandler(async (req: Request, res: Response) => {
  const result = await createVersion(req.user!.sub, req.params.projectId, req.body);
  res.status(201).json(result);
});

export const getVersion = asyncHandler(async (req: Request, res: Response) => {
  const result = await getVersionById(req.user!.sub, req.params.versionId);
  res.status(200).json(result);
});

export const completeVersionFileUpload = asyncHandler(async (req: Request, res: Response) => {
  const result = await markFileUploadComplete(req.user!.sub, req.params.versionId, req.params.fileId);
  res.status(200).json(result);
});

export const getVersionComments = asyncHandler(async (req: Request, res: Response) => {
  const result = await listComments(req.user!.sub, req.params.versionId);
  res.status(200).json(result);
});

export const createVersionComment = asyncHandler(async (req: Request, res: Response) => {
  const result = await createComment(req.user!.sub, req.params.versionId, req.body);
  res.status(201).json(result);
});

export const downloadVersion = asyncHandler(async (req: Request, res: Response) => {
  const bundle = await getVersionDownloadBundle(req.user!.sub, req.params.versionId);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${bundle.zipFileName}"`);

  const archive = archiver("zip", {
    zlib: { level: 9 }
  });

  archive.on("error", (error) => {
    res.destroy(error as Error);
  });

  archive.pipe(res);

  for (const file of bundle.files) {
    const stream = await getStoredObjectStream(file.storageKey);
    archive.append(stream, {
      name: `${file.kind.toLowerCase()}/${String(file.position + 1).padStart(2, "0")}-${file.id.slice(0, 8)}-${sanitizeFileName(file.originalFileName)}`
    });
  }

  await archive.finalize();
});

