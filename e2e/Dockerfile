# The image tag must match the @playwright/test version in package.json:
# the browsers are baked into this base image, so no download happens at build time.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /e2e

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=true
# Default target is the frontend container on the deployment network.
ENV BASE_URL=http://frontend

CMD ["npx", "playwright", "test"]
