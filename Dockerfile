FROM node:20-bookworm-slim

WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stembridge
ARG DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stembridge

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=${DATABASE_URL}
ENV DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL}

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./

RUN npm ci --include=dev

COPY src ./src

RUN npm run build
RUN npm prune --omit=dev

EXPOSE 4000

USER node

CMD ["npm", "run", "start"]
