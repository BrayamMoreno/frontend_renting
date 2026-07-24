# Etapa 1: Compilación de la aplicación Angular (Build Stage)
FROM node:20-alpine AS build
WORKDIR /app

# Copiar package.json y package-lock.json e instalar dependencias
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar código fuente y compilar proyecto
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx de Producción (Production Stage)
FROM nginx:alpine

# Copiar script de inicialización para inyección de entorno
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copiar configuración de Nginx con proxy inverso al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar estáticos compilados de la SPA de Angular a la carpeta publica de Nginx
COPY --from=build /app/dist/app/browser /usr/share/nginx/html

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
