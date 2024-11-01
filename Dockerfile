# Phase 1: Build
FROM node:alpine as build-stage

WORKDIR /app

# Repository-Inhalt kopieren und Abhängigkeiten installieren
COPY . .
RUN npm install && npm run build

# Phase 2: Bereitstellung mit Nginx und API
FROM nginx:alpine

# Installiere Node.js für die API
RUN apk add --no-cache nodejs npm

# Kopiere die gebauten Dateien in den Nginx-Webordner
COPY --from=build-stage /app/dist/web /usr/share/nginx/html

# Kopiere die API-Datei und installiere Abhängigkeiten (express und cors)
COPY settings-api.js /app/settings-api.js
WORKDIR /app
RUN npm install express cors

# Exponiere die Ports für Nginx und die API
EXPOSE 80 3000

# Starten von Nginx und der API
CMD ["sh", "-c", "nginx -g 'daemon off;' & node /app/settings-api.js"]
