# gRPC API Dockerfile
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=50051

# Expose gRPC port
EXPOSE 50051

# Start the application
CMD ["node", "index.js"]
