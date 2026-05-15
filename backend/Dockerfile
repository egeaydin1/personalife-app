FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl openssl-dev tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-tur

# ── development ─────────────────────────────────────────────────────────────
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
# db push + generate on every start so schema changes are always applied
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx prisma generate && npm run dev"]

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-tur
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["node", "dist/index.js"]
