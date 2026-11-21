FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY scripts/build-server.js ./scripts/build-server.js
COPY scripts/install-static-client.js ./scripts/install-static-client.js
COPY back ./back
COPY front ./front
RUN npm run build
RUN node scripts/install-static-client.js /app/bin

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libicu72 libssl3 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080
ARG APP_RELEASE=unknown
ENV APP_RELEASE=$APP_RELEASE
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist/back ./back
COPY --from=build --chown=node:node /app/dist/front ./front
COPY --from=build --chown=node:node /app/bin ./bin
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "back/index.js"]
