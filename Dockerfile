FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Git-commit van deze build; doorgeven met:
#   docker compose build --build-arg GIT_COMMIT=$(git rev-parse --short HEAD)
# Ontbreekt de arg, dan toont de app 'onbekend' (zie backend/versie.ts).
ARG GIT_COMMIT=onbekend
ENV GIT_COMMIT=$GIT_COMMIT
EXPOSE 3000
# Dev: nodemon herlaadt bij wijzigingen; ts-node transpileert TypeScript on the fly.
# Prod: gebruik "npm run build && npm start" (tsc + node dist/backend/server.js).
ENTRYPOINT ["npx", "nodemon"]
