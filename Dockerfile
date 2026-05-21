FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon --save
COPY . .
EXPOSE 3000
# CMD ["node", "server.js"]
ENTRYPOINT [ "nodemon", "--inspect=0.0.0.0", "backend/server.js" ]
