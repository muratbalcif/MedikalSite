# Multi-stage production image for ANAMUR ACİL MEDİKAL Web (Next.js standalone).
# Build from repository root:
#   docker build -f web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://example.com \
#     --build-arg NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.example.com \
#     -t furkansogutma-web .
#
# NEXT_PUBLIC_* are baked in at build time — never pass secrets as build args.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY admin/package.json ./admin/
COPY api/package.json ./api/
RUN npm ci -w furkansogutma-web --include-workspace-root=false

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY package.json package-lock.json ./
COPY web ./web

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL

RUN npm run build -w furkansogutma-web

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3002 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
  && addgroup -S app && adduser -S app -G app

# outputFileTracingRoot = monorepo root → standalone layout includes web/
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./web/.next/static
COPY --from=build /app/web/public ./web/public

USER app
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/api/health >/dev/null || exit 1
CMD ["node", "web/server.js"]
