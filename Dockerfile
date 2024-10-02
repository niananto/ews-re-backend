FROM node:18-alpine

ARG PORT=8080

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["npm", "start"]
