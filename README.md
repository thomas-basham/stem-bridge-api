# StemBridge API

Backend for StemBridge, a music collaboration app for producers working across projects, versions, files, comments, invites, and activity history.

The API is built with Express, TypeScript, Prisma, PostgreSQL, JWT auth, and S3-backed file storage.

## Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Vitest + Supertest
- AWS S3

## Project Structure

```text
src/
  app.ts
  server.ts
  config/
  lib/
  middleware/
  modules/
  utils/
prisma/
  schema.prisma
  seed.ts
tests/
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Copy the env file

```bash
cp .env.example .env
```

3. Generate the Prisma client

```bash
npm run prisma:generate
```

## Environment Variables

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stembridge?schema=public"
DIRECT_DATABASE_URL=
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:3000
JSON_BODY_LIMIT=1mb
URL_ENCODED_BODY_LIMIT=100kb
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
UPLOAD_FILE_SIZE_LIMIT_BYTES=104857600
S3_REGION=us-east-1
S3_BUCKET=stembridge-dev
# Optional locally. In Lambda, prefer the execution role instead of static keys.
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
APP_BASE_URL=http://localhost:4000
```

Notes:

- `CORS_ORIGINS` is a comma-separated allowlist.
- `DATABASE_URL` is the runtime connection string used by the API.
- `DIRECT_DATABASE_URL` is optional locally, but recommended in production for Prisma migrations when you use a pooled Postgres connection.
- `UPLOAD_FILE_SIZE_LIMIT_BYTES` controls both legacy multipart uploads and presigned upload URL requests.
- `APP_BASE_URL` is used when building app-facing URLs.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are optional. If omitted, the AWS SDK uses the default credential provider chain, including the Lambda execution role.

## Database

Run migrations:

```bash
npm run prisma:migrate
```

Seed demo data:

```bash
npm run prisma:seed
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

## Running The API

Start the dev server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Start the built server:

```bash
npm run start
```

Run tests:

```bash
npm run test
```

## AWS Lambda Deployment

The primary AWS deployment path for this repo is:

- API on AWS Lambda behind API Gateway HTTP API
- PostgreSQL on Supabase or another pooled Postgres provider
- file storage on Amazon S3 with browser direct uploads/downloads

Deployment files included in this repo:

- [template.yaml](./template.yaml)

Important database note:

- `DATABASE_URL` should be your pooled Supabase runtime connection string
- `DIRECT_DATABASE_URL` should be the direct Supabase connection string for Prisma migrations
- Run Prisma migrations separately from Lambda request handling.

Deploy steps:

1. Install the AWS SAM CLI.
2. Create an S3 bucket for file assets.
3. Configure the bucket CORS policy for your frontend origin:

```json
[
  {
    "AllowedOrigins": ["https://your-frontend.example.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

4. Build and validate the API:

```bash
npm run lambda:package
npm run sam:validate
```

5. Run migrations from your machine or CI with `DIRECT_DATABASE_URL` set:

```bash
npm run prisma:migrate:deploy
```

6. Deploy with guided parameters:

```bash
npm run sam:deploy
```

If you run `sam deploy` directly instead of `npm run sam:deploy`, run `npm run lambda:package` first. The SAM template deploys `.lambda-package` so Lambda does not receive the full local workspace or development `node_modules`.

Health check:

```bash
curl https://your-api-id.execute-api.region.amazonaws.com/health
```

The S3 bucket does not need public-read access. Stored file `url` values are canonical object URLs; authenticated access uses short-lived presigned URLs.

The Docker/Lightsail files are still available as an alternate long-running server deployment path. For that path, see [docs/lightsail-deploy.md](./docs/lightsail-deploy.md).

## API Conventions

Success responses:

```json
{
  "message": "Project created successfully",
  "data": {}
}
```

Error responses:

```json
{
  "message": "Validation failed",
  "details": {}
}
```

Protected routes require:

```http
Authorization: Bearer <jwt>
```

## Endpoint Summary

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`

### Invites

- `POST /projects/:projectId/invites`
- `GET /projects/:projectId/invites`
- `POST /invites/:token/accept`

### Song Versions

- `POST /projects/:projectId/versions`
- `GET /projects/:projectId/versions`
- `GET /versions/:versionId`
- `GET /versions/:versionId/download`

### File Assets

- `POST /versions/:versionId/files/upload-url`
- `POST /versions/:versionId/files/upload`
- `POST /versions/:versionId/files/metadata`
- `GET /versions/:versionId/files/:fileId/download-url`
- `GET /versions/:versionId/files/:fileId/download`
- `GET /versions/:versionId/files`

### Comments

- `POST /versions/:versionId/comments`
- `GET /versions/:versionId/comments`
- `DELETE /comments/:commentId`

### Activity Feed

- `GET /projects/:projectId/activity?page=1&pageSize=20`

## Example Payloads

### Register User

Request:

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "email": "producer@stembridge.dev",
  "password": "Password123!"
}
```

Response:

```json
{
  "message": "Registration successful",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "user-id",
      "email": "producer@stembridge.dev",
      "createdAt": "2026-04-22T10:00:00.000Z",
      "updatedAt": "2026-04-22T10:00:00.000Z"
    }
  }
}
```

### Login User

Request:

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "producer@stembridge.dev",
  "password": "Password123!"
}
```

Response:

```json
{
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "user-id",
      "email": "producer@stembridge.dev",
      "createdAt": "2026-04-22T10:00:00.000Z",
      "updatedAt": "2026-04-22T10:00:00.000Z"
    }
  }
}
```

### Create Project

Request:

```http
POST /projects
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "name": "Night Session",
  "bpm": 126,
  "musicalKey": "F Minor"
}
```

Response:

```json
{
  "message": "Project created successfully",
  "data": {
    "project": {
      "id": "project-id",
      "name": "Night Session",
      "bpm": 126,
      "musicalKey": "F Minor",
      "owner": {
        "id": "user-id",
        "email": "producer@stembridge.dev"
      },
      "collaboratorCount": 1,
      "versionCount": 0,
      "collaborators": [
        {
          "id": "membership-id",
          "joinedAt": "2026-04-22T10:01:00.000Z",
          "user": {
            "id": "user-id",
            "email": "producer@stembridge.dev"
          }
        }
      ],
      "latestVersion": null
    }
  }
}
```

### Create Song Version

Request:

```http
POST /projects/:projectId/versions
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "notes": "Second mix pass with tighter drums"
}
```

Response:

```json
{
  "message": "Version created successfully",
  "data": {
    "version": {
      "id": "version-id",
      "projectId": "project-id",
      "versionNumber": 2,
      "notes": "Second mix pass with tighter drums",
      "createdBy": {
        "id": "user-id",
        "email": "producer@stembridge.dev"
      },
      "fileAssets": [],
      "comments": []
    }
  }
}
```

### Add Comment

Request:

```http
POST /versions/:versionId/comments
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "timestampSeconds": 42.5,
  "text": "The bass transition works well here."
}
```

Response:

```json
{
  "message": "Comment created successfully",
  "data": {
    "comment": {
      "id": "comment-id",
      "versionId": "version-id",
      "timestampSeconds": 42.5,
      "text": "The bass transition works well here.",
      "author": {
        "id": "user-id",
        "email": "producer@stembridge.dev"
      }
    }
  }
}
```

### Create Presigned Upload URL

Request:

```http
POST /versions/:versionId/files/upload-url
Authorization: Bearer <jwt>
Content-Type: application/json
```

Body:

```json
{
  "originalName": "Rough Mix.wav",
  "type": "MIX",
  "mimeType": "audio/wav",
  "sizeBytes": 13104442
}
```

Response:

```json
{
  "message": "File upload URL created successfully",
  "data": {
    "upload": {
      "url": "https://bucket.s3.region.amazonaws.com/...?X-Amz-Signature=...",
      "method": "PUT",
      "headers": {
        "Content-Type": "audio/wav"
      },
      "expiresInSeconds": 900
    },
    "metadata": {
      "name": "rough-mix.wav",
      "originalName": "Rough Mix.wav",
      "type": "MIX",
      "mimeType": "audio/wav",
      "sizeBytes": 13104442,
      "storageKey": "projects/project-id/versions/version-id/1700000000000-Rough-Mix.wav",
      "url": "https://bucket.s3.region.amazonaws.com/..."
    }
  }
}
```

Frontend flow:

1. Request `/upload-url`.
2. `PUT` the raw file to `data.upload.url` using the returned headers.
3. After S3 returns success, send `data.metadata` to `/versions/:versionId/files/metadata`.

### Create File Metadata

Request:

```http
POST /versions/:versionId/files/metadata
Authorization: Bearer <jwt>
Content-Type: application/json
```

Use the `metadata` object returned by `/upload-url` after the direct S3 upload succeeds.

### Download File Asset

Request:

```http
GET /versions/:versionId/files/:fileId/download-url
Authorization: Bearer <jwt>
```

Response:

```json
{
  "message": "File download URL created successfully",
  "data": {
    "file": {
      "id": "file-id",
      "versionId": "version-id",
      "name": "rough-mix.wav",
      "originalName": "Rough Mix.wav",
      "type": "MIX",
      "mimeType": "audio/wav",
      "sizeBytes": 13104442,
      "storageKey": "projects/project-id/versions/version-id/1700000000000-Rough-Mix.wav",
      "url": "https://bucket.s3.region.amazonaws.com/...",
      "createdAt": "2026-04-22T10:05:00.000Z"
    },
    "download": {
      "url": "https://bucket.s3.region.amazonaws.com/...?X-Amz-Signature=...",
      "method": "GET",
      "expiresInSeconds": 900
    }
  }
}
```

`GET /versions/:versionId/files/:fileId/download` remains available. For normal S3 files it redirects to a presigned download URL instead of streaming the file through Lambda. Legacy multipart upload at `/versions/:versionId/files/upload` remains available for local/Docker usage, but Lambda clients should use presigned uploads.
