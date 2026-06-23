FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g pnpm && pnpm install --frozen-lockfile

RUN pnpm --filter @imgcraft/server build

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
