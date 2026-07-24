# Etapa 1: Compilación de la aplicación Angular (Build Stage)
FROM node:20-alpine AS build
WORKDIR /app

# Copiar package.json y package-lock.json e instalar dependencias
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar código fuente y compilar proyecto
COPY . .
RUN npm run build

# =================================================================
# Etapa 2: Servidor estático ligero de Node (SIN Nginx)
# =================================================================
FROM node:20-alpine

WORKDIR /app

# Instalar "serve", un paquete oficial y ligero para servir archivos estáticos
RUN npm install -g serve

# Instalar "gettext" por si tu docker-entrypoint.sh usa el comando "envsubst" para variables
RUN apk add --no-cache gettext

# Copiar script de inicialización
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copiar los archivos estáticos compilados de Angular
COPY --from=build /app/dist/app/browser ./browser

# Ahora SÓLO existirá este puerto
EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]

# Levantar la aplicación en el puerto 3000 y en modo SPA (-s para manejar rutas de Angular)
CMD ["serve", "-s", "browser", "-l", "3000"]