FROM node:22-alpine
WORKDIR /app
COPY . .
RUN corepack enable
CMD ["sh", "-lc", "pnpm install && pnpm --filter @cura/web dev"]
