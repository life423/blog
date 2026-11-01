FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY scripts/build-server.js ./scripts/build-server.js
COPY back ./back
COPY front ./front
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist/back ./back
COPY --from=build --chown=node:node /app/dist/front ./front
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "back/index.js"]
