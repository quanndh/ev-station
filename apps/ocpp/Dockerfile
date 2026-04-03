FROM node:20-alpine AS base

WORKDIR /repo

RUN corepack enable

# Keep pnpm version aligned with repo.
RUN corepack prepare pnpm@8.14.1 --activate

# Copy workspace metadata + lockfile
COPY package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml ./

# Copy only what ocpp runtime/build needs
COPY apps/ocpp ./apps/ocpp
COPY packages/db ./packages/db
COPY packages/types ./packages/types

# Install dependencies for ocpp + shared packages
RUN pnpm install --frozen-lockfile --filter @ev/ocpp... --filter @ev/db... --filter @ev/types...

# Generate Prisma client inside the build container
RUN pnpm -C packages/db generate

# Build ocpp service (TypeScript -> dist/)
RUN pnpm -C apps/ocpp build

EXPOSE 9000

CMD ["node", "apps/ocpp/dist/index.js"]

