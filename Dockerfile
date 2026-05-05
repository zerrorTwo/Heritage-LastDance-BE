FROM node:18-alpine
WORKDIR /app
COPY package.json package.json
RUN npm ci --omit=dev || npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
