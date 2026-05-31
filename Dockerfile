FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
# Dev: nodemon herlaadt bij wijzigingen; ts-node transpileert TypeScript on the fly.
# Prod: gebruik "npm run build && npm start" (tsc + node dist/backend/server.js).
ENTRYPOINT ["npx", "nodemon"]
