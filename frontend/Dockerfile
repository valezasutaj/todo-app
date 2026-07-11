FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `docker build --target test` runs the suite in isolation (used by CI).
FROM build AS test
CMD ["npm", "run", "test:ci"]

FROM build AS build-app
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY --from=build-app /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
