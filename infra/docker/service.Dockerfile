FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
