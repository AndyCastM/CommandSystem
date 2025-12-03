# Etapa 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Generar build de Nest
RUN npm run build

# Generar Prisma Client
RUN npx prisma generate

# Etapa 2: Producción
FROM node:18-alpine
WORKDIR /app

# Copiar node_modules y dist desde el builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Exponer puerto
EXPOSE 3000

# Arrancar la app
CMD ["node", "dist/main.js"]
