import request from "supertest";

import { describe, expect, it } from "vitest";

import { app } from "../../src/app";
import { getSeedAssetSizeBytes } from "../../src/lib/storage/s3";
import { seedFileAsset, seedProject, seedSongVersion, seedUser } from "../helpers/prisma-mock";

const loginAndGetToken = async (email: string, password: string) => {
  const loginResponse = await request(app).post("/auth/login").send({
    email,
    password
  });

  expect(loginResponse.status).toBe(200);

  return loginResponse.body.data.token as string;
};

describe("critical backend flows", () => {
  it("registers a user", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "new-user@stembridge.dev",
      password: "Password123!"
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Registration successful");
    expect(response.body.data.user.email).toBe("new-user@stembridge.dev");
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it("logs in a seeded user", async () => {
    const seededUser = await seedUser({
      email: "login-user@stembridge.dev"
    });

    const response = await request(app).post("/auth/login").send({
      email: seededUser.email,
      password: seededUser.password
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.user.email).toBe(seededUser.email);
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it("returns the current authenticated user", async () => {
    const seededUser = await seedUser({
      email: "me-user@stembridge.dev"
    });
    const token = await loginAndGetToken(seededUser.email, seededUser.password);

    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Current user retrieved successfully");
    expect(response.body.data.user).toMatchObject({
      id: seededUser.id,
      email: seededUser.email
    });
  });

  it("creates a project for the authenticated user", async () => {
    const seededUser = await seedUser({
      email: "project-owner@stembridge.dev"
    });
    const token = await loginAndGetToken(seededUser.email, seededUser.password);

    const response = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Night Session",
        bpm: 126,
        musicalKey: "F Minor"
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Project created successfully");
    expect(response.body.data.project).toMatchObject({
      name: "Night Session",
      bpm: 126,
      musicalKey: "F Minor"
    });
    expect(response.body.data.project.owner.email).toBe(seededUser.email);
    expect(response.body.data.project.collaborators).toHaveLength(1);
    expect(response.body.data.project.latestVersion).toBeNull();
  });

  it("lists projects where the current user is a member", async () => {
    const memberUser = await seedUser({
      email: "member@stembridge.dev"
    });
    const otherUser = await seedUser({
      email: "other@stembridge.dev"
    });

    const collaboratorProject = seedProject({
      ownerId: otherUser.id,
      name: "Collaborator Project",
      memberUserIds: [otherUser.id, memberUser.id]
    });
    seedProject({
      ownerId: otherUser.id,
      name: "Hidden Project",
      memberUserIds: [otherUser.id]
    });

    const token = await loginAndGetToken(memberUser.email, memberUser.password);
    const response = await request(app).get("/projects").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Projects retrieved successfully");
    expect(response.body.data.projects).toHaveLength(1);
    expect(response.body.data.projects[0]).toMatchObject({
      id: collaboratorProject.id,
      name: "Collaborator Project"
    });
  });

  it("creates a new song version with auto-incremented version number", async () => {
    const seededUser = await seedUser({
      email: "version-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id,
      versionNumber: 1,
      notes: "Initial bounce"
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .post(`/projects/${project.id}/versions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        notes: "Second pass with tighter drums"
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Version created successfully");
    expect(response.body.data.version).toMatchObject({
      projectId: project.id,
      versionNumber: 2,
      notes: "Second pass with tighter drums"
    });
    expect(response.body.data.version.createdBy.email).toBe(seededUser.email);
    expect(response.body.data.version.fileAssets).toEqual([]);
    expect(response.body.data.version.comments).toEqual([]);
  });

  it("adds a timestamped comment to a version", async () => {
    const seededUser = await seedUser({
      email: "comment-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id,
      versionNumber: 1
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .post(`/versions/${version.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        timestampSeconds: 42.5,
        text: "The bass transition works well here."
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Comment created successfully");
    expect(response.body.data.comment).toMatchObject({
      versionId: version.id,
      timestampSeconds: 42.5,
      text: "The bass transition works well here."
    });
    expect(response.body.data.comment.author).toMatchObject({
      id: seededUser.id,
      email: seededUser.email
    });
  });

  it("creates a presigned upload URL for a version file", async () => {
    const seededUser = await seedUser({
      email: "upload-url-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .post(`/versions/${version.id}/files/upload-url`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        originalName: "lead vocal.wav",
        type: "STEM",
        mimeType: "audio/wav",
        sizeBytes: 2048
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("File upload URL created successfully");
    expect(response.body.data.upload).toMatchObject({
      method: "PUT",
      headers: {
        "Content-Type": "audio/wav"
      },
      expiresInSeconds: 900
    });
    expect(response.body.data.upload.url).toEqual(expect.stringContaining("X-Amz-Signature"));
    expect(response.body.data.metadata).toMatchObject({
      name: "lead-vocal.wav",
      originalName: "lead vocal.wav",
      type: "STEM",
      mimeType: "audio/wav",
      sizeBytes: 2048
    });
    expect(response.body.data.metadata.storageKey).toEqual(
      expect.stringContaining(`projects/${project.id}/versions/${version.id}/`)
    );
  });

  it("rejects presigned upload URL requests over the configured file size limit", async () => {
    const seededUser = await seedUser({
      email: "oversized-upload-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .post(`/versions/${version.id}/files/upload-url`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        originalName: "huge-mix.wav",
        type: "MIX",
        mimeType: "audio/wav",
        sizeBytes: Number(process.env.UPLOAD_FILE_SIZE_LIMIT_BYTES) + 1
      });

    expect(response.status).toBe(413);
    expect(response.body.message).toBe("File exceeds the configured upload size limit.");
  });

  it("rejects file metadata whose storage key is outside the version prefix", async () => {
    const seededUser = await seedUser({
      email: "metadata-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .post(`/versions/${version.id}/files/metadata`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "stolen.wav",
        originalName: "stolen.wav",
        type: "STEM",
        mimeType: "audio/wav",
        sizeBytes: 1024,
        storageKey: "projects/other-project/versions/other-version/stolen.wav",
        url: "https://stembridge-test.s3.us-west-2.amazonaws.com/projects/other-project/versions/other-version/stolen.wav"
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "File storage key does not belong to this project version."
    );
  });

  it("returns a presigned download URL for an existing file", async () => {
    const seededUser = await seedUser({
      email: "download-url-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id
    });
    const fileAsset = seedFileAsset({
      songVersionId: version.id,
      storageKey: `projects/${project.id}/versions/${version.id}/mix.wav`
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .get(`/versions/${version.id}/files/${fileAsset.id}/download-url`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("File download URL created successfully");
    expect(response.body.data.file).toMatchObject({
      id: fileAsset.id,
      versionId: version.id,
      storageKey: fileAsset.storageKey
    });
    expect(response.body.data.download).toMatchObject({
      method: "GET",
      expiresInSeconds: 900
    });
    expect(response.body.data.download.url).toEqual(expect.stringContaining("X-Amz-Signature"));
  });

  it("reports the generated byte size for seed assets", async () => {
    const seededUser = await seedUser({
      email: "seed-asset-size-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id
    });
    const storageKey = `seed-assets/${project.id}/${version.id}/neon-skyline-mix-v3.wav`;
    const fileAsset = seedFileAsset({
      songVersionId: version.id,
      originalName: "Neon Skyline Mix v3.wav",
      sizeBytes: 14_998_044,
      storageKey
    });

    const token = await loginAndGetToken(seededUser.email, seededUser.password);
    const response = await request(app)
      .get(`/versions/${version.id}/files`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.files).toContainEqual(
      expect.objectContaining({
        id: fileAsset.id,
        sizeBytes: getSeedAssetSizeBytes(storageKey)
      })
    );
  });

  it("requires authentication before creating file access URLs", async () => {
    const seededUser = await seedUser({
      email: "unauthorized-file-user@stembridge.dev"
    });
    const project = seedProject({
      ownerId: seededUser.id,
      memberUserIds: [seededUser.id]
    });
    const version = seedSongVersion({
      projectId: project.id,
      createdById: seededUser.id
    });

    const response = await request(app).post(`/versions/${version.id}/files/upload-url`).send({
      originalName: "lead.wav",
      type: "STEM",
      mimeType: "audio/wav",
      sizeBytes: 1024
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing Authorization header.");
  });
});
