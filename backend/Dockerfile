FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.sequelizerc ./.sequelizerc
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /var/www/frontend/dist
# フロントエンドの静的ファイルは docker-compose.yml の volumes マウントで提供される
# （./frontend/dist:/var/www/frontend/dist:ro）
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
