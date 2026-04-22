# StemBridge API

Express backend scaffold in TypeScript for StemBridge, a music collaboration app for sharing projects, versions, and feedback between producers.

## Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- ESLint
- Prettier
- dotenv
- tsx

## Project Structure

```text
src/
  app.ts
  server.ts
  config/
  middleware/
  modules/
  utils/
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client:

   ```bash
   npm run prisma:generate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

The server exposes a health check at `GET /health`.

## Available Scripts

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run test:watch`
- `npm run start`
- `npm run typecheck`
- `npm run lint`
- `npm run lint:fix`
- `npm run format`
- `npm run format:check`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:studio`

## Notes

- `src/config/env.ts` validates required environment variables at startup.
- `src/lib/prisma.ts` provides a shared Prisma client instance.
- `src/middleware/error-handler.ts` centralizes application and Prisma error handling.
- `src/modules/health` is the first feature module and can be used as the pattern for additional modules.
- Tests use Vitest + Supertest with an in-memory mocked Prisma strategy, so they do not require a live PostgreSQL or S3 instance.

## Running Tests

Run the backend tests with:

```bash
npm run test
```

For watch mode:

```bash
npm run test:watch
```
