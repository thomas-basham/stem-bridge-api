# StemBridge API

Backend MVP for StemBridge, a desktop music collaboration app for producers working across DAWs like Ableton and FL Studio.

This API covers:

- JWT auth with refresh token rotation
- Projects and collaborator invitations
- Song version tracking
- Direct-to-S3 file uploads for project files, stems, mixdowns, MIDI, and samples
- Timestamped comments on versions
- Zip downloads for completed version files

## Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- AWS S3
- Zod

## Architecture

The codebase is organized by feature, with thin controllers and validation at the edge:

```text
src/
  config/
  database/
  features/
    auth/
    projects/
    versions/
  lib/
    auth/
    errors/
    http/
    storage/
  middleware/
  routes/
```

Each feature module follows the same pattern:

- `*.routes.ts` wires endpoints
- `*.controller.ts` stays thin and delegates
- `*.service.ts` owns business logic and Prisma access
- `*.schemas.ts` defines Zod request validation

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `S3_REGION`
- `S3_BUCKET`
- AWS credentials or local S3-compatible endpoint settings

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

### 4. Run migrations

```bash
npm run prisma:migrate
```

### 5. Seed demo data

```bash
npm run prisma:seed
```

Seeded users:

- `owner@stembridge.dev` / `Password123!`
- `collaborator@stembridge.dev` / `Password123!`

### 6. Start the API

```bash
npm run dev
```

The server runs on `http://localhost:4000` by default.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Environment Variables

From `.env.example`:

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stembridge?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-string-at-least-32-chars"
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30
INVITATION_TTL_DAYS=7
CLIENT_ORIGIN=
S3_REGION=us-east-1
S3_BUCKET=stembridge-dev
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false
```

`AWS_S3_ENDPOINT` and `AWS_S3_FORCE_PATH_STYLE` are useful for local S3-compatible services like MinIO.

## API Overview

Base path: `/api`

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

### Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/invitations`
- `POST /projects/invitations/:token/accept`

### Versions

- `GET /projects/:projectId/versions`
- `POST /projects/:projectId/versions`
- `GET /versions/:versionId`
- `GET /versions/:versionId/comments`
- `POST /versions/:versionId/comments`
- `POST /versions/:versionId/files/:fileId/complete`
- `GET /versions/:versionId/download`

## Upload Flow

Version file uploads are designed for direct client-to-S3 transfer:

1. Create a version with a `files` array in `POST /projects/:projectId/versions`.
2. The API creates `VersionFile` records and returns presigned S3 `PUT` URLs.
3. The desktop client uploads file bytes directly to S3.
4. The client calls `POST /versions/:versionId/files/:fileId/complete` for each finished upload.
5. Completed files are included in the version download zip.

## Route Wiring Note

The nested versions router is mounted before the general projects router in [src/routes/index.ts](/Users/Basham/GitHub/Personal-Projects/stem-bridge-api/src/routes/index.ts:1):

- `/projects/:projectId/versions` is mounted first
- `/projects` is mounted after it

That avoids ambiguous route matching and keeps nested project-version routes explicit.

## Current MVP Notes

- Auth uses bearer access tokens plus stored refresh tokens.
- Invitations are token-based and expire after `INVITATION_TTL_DAYS`.
- Zip downloads stream files from S3 instead of pulling them onto local disk first.
- Request validation is handled with Zod middleware before controllers run.
