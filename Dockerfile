FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
COPY . .
RUN npm run db:generate && npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs VEYLORIQ
COPY --from=builder --chown=VEYLORIQ:nodejs /app/public ./public
COPY --from=builder --chown=VEYLORIQ:nodejs /app/.next/standalone ./
COPY --from=builder --chown=VEYLORIQ:nodejs /app/.next/static ./.next/static
USER VEYLORIQ
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

FROM dependencies AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node . .
RUN npm run db:generate
USER node
CMD ["npm", "run", "worker"]
