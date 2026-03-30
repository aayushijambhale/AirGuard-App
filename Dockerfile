# Use Node.js 22 as base image for full compatibility with native modules like better-sqlite3
FROM node:22

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application files
COPY . .

# Build the frontend (Vite)
RUN npm run build

# Expose the API and Web port
EXPOSE 3000

# Set environment to production to serve static files from dist
ENV NODE_ENV=production

# Start the server
CMD ["npx", "tsx", "server.ts"]
