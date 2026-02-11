# Local development — Node Express backend
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy app code (overridden by volume mount in docker-compose for dev)
COPY . .

EXPOSE 3001

# Use dev script so --watch works when code is mounted
CMD ["npm", "run", "dev"]
