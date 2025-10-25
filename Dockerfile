FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./
COPY server.js ./

# Install dependencies
RUN npm install

# Expose port
EXPOSE 8080

# Start the HTTP wrapper
CMD ["node", "server.js"]
