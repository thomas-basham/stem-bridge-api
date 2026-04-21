import type { Readable } from "node:stream";

import archiver from "archiver";
import type { Request, Response } from "express";

import { getFileStream } from "../../lib/storage/s3";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { sendSuccess } from "../../utils/response";
import {
  createVersion,
  getVersionById,
  getVersionDownloadBundle,
  listVersionsForProject
} from "./version.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createVersion(req.projectAccess!.projectId, req.auth!.sub, req.body);
  sendSuccess(res, 201, "Version created successfully", result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listVersionsForProject(req.projectAccess!.projectId);
  sendSuccess(res, 200, "Versions retrieved successfully", result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await getVersionById(req.versionAccess!.versionId);
  sendSuccess(res, 200, "Version retrieved successfully", result);
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const bundle = await getVersionDownloadBundle(req.versionAccess!.versionId);
  const fileStreams: Array<{ stream: Readable; archiveName: string }> = [];

  try {
    for (const file of bundle.files) {
      const stream = await getFileStream(file.storageKey);
      fileStreams.push({
        stream,
        archiveName: file.archiveName
      });
    }
  } catch (error) {
    for (const file of fileStreams) {
      file.stream.destroy();
    }

    throw new AppError(502, "Failed to retrieve one or more version files from storage.", {
      reason: error instanceof Error ? error.message : "Unknown storage error"
    });
  }

  const archive = archiver("zip", {
    zlib: {
      level: 9
    }
  });

  const cleanupStreams = () => {
    for (const file of fileStreams) {
      file.stream.destroy();
    }
  };

  const handleArchiveFailure = (error: Error) => {
    cleanupStreams();
    void archive.abort();

    if (!res.destroyed) {
      res.destroy(error);
    }
  };

  archive.on("warning", handleArchiveFailure);
  archive.on("error", handleArchiveFailure);

  res.on("close", () => {
    if (!res.writableEnded) {
      cleanupStreams();
      void archive.abort();
    }
  });

  res.status(200);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${bundle.zipFileName}"`);

  archive.pipe(res);

  for (const file of fileStreams) {
    file.stream.on("error", handleArchiveFailure);
    archive.append(file.stream, {
      name: file.archiveName
    });
  }

  await archive.finalize();
});
