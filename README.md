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
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
APP_BASE_URL=http://localhost:4000
```

Notes:

- `CORS_ORIGINS` is a comma-separated allowlist.
- `DATABASE_URL` is the runtime connection string used by the API.
- `DIRECT_DATABASE_URL` is optional locally, but recommended in production for Prisma migrations when you use a pooled Postgres connection.
- `UPLOAD_FILE_SIZE_LIMIT_BYTES` controls multer memory upload limits.
- `APP_BASE_URL` is used when building app-facing URLs.

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

## Low-Cost AWS Deployment

The cheapest AWS-friendly path for this repo is:

- API on a small Amazon Lightsail Linux instance
- PostgreSQL on Supabase
- file storage on Amazon S3

Deployment files included in this repo:

- [Dockerfile](./Dockerfile)
- [docker-compose.lightsail.yml](./docker-compose.lightsail.yml)
- [.env.production.example](./.env.production.example)

Important database note:

- `DATABASE_URL` should be your pooled Supabase runtime connection string
- `DIRECT_DATABASE_URL` should be the direct Supabase connection string for Prisma migrations

Deploy steps:

1. Create a small Lightsail instance.
2. Install Docker and the Docker Compose plugin.
3. Copy this repo to the instance.
4. Create `.env.production` from `.env.production.example`.
5. Set `APP_BASE_URL` to the public IP or domain for the API.
6. Open port `80` in the Lightsail networking tab.
7. Start the API:

```bash
docker compose -f docker-compose.lightsail.yml up --build -d
```

The container runs `prisma migrate deploy` before starting the server.

Health check:

```bash
curl http://127.0.0.1/health
```

For a full step-by-step guide, see [docs/lightsail-deploy.md](./docs/lightsail-deploy.md).

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

- `POST /versions/:versionId/files/upload`
- `POST /versions/:versionId/files/metadata`
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

### Upload File Asset

Request:

```http
POST /versions/:versionId/files/upload
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

Form fields:

- `file`: binary file
- `type`: one of `STEM`, `MIX`, `MIDI`, `SAMPLE`, `OTHER`

Response:

```json
{
  "message": "File uploaded successfully",
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
    }
  }
}
```
