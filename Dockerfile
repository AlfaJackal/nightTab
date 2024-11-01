# Phase 1: Build
FROM node:alpine as build-stage

# Arbeitsverzeichnis für den Build
WORKDIR /app

# Repository klonen
RUN apk add --no-cache git && \
    git clone https://github.com/AlfaJackal/nightTab.git . 

# Abhängigkeiten installieren und Projekt bauen
RUN npm install && npm run build

# Phase 2: Bereitstellung mit Nginx
FROM nginx:alpine

# Kopiere die gebauten Dateien aus /dist/web in den Nginx-Webordner
COPY --from=build-stage /app/dist/web /usr/share/nginx/html

# Erstelle ein Verzeichnis für Benutzerdaten und Einstellungen
RUN mkdir -p /usr/share/nginx/html/data

# Standard Nginx-Port
EXPOSE 80
