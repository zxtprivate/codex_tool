FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
COPY server/package.json ./package.json
RUN npm install --omit=dev
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/web/dist /app/web/dist
EXPOSE 8787
CMD ["node", "dist/index.js"]
