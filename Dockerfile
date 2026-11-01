FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev --ignore-scripts
EXPOSE 8080
CMD ["npm", "start"]
