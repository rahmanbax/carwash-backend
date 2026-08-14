# ================================
# Base Stage
# ================================
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# ================================
# Development Stage
# ================================
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/carwash_db"
RUN npx prisma generate

# Expose port
EXPOSE 8000

# Run development server with hot-reload
CMD ["npm", "run", "dev"]

# ================================
# Production Build Stage
# ================================
FROM base AS builder

# Install all dependencies for building
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/carwash_db"
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ================================
# Production Stage
# ================================
FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Copy public folder for static files
COPY --from=builder /app/public ./public

# Create uploads directory
RUN mkdir -p /app/public/uploads

# Expose port
EXPOSE 8000

# Set environment
ENV NODE_ENV=production

# Run production server
CMD ["node", "dist/index.js"]
