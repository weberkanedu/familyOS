# Aile Panosu - Dokploy / herhangi bir Docker host icin derleme
# Kullanim:  docker build -t ailepanosu .  &&  docker run -p 8080:80 ailepanosu

FROM node:20-alpine AS build
WORKDIR /app

# Bagimliliklar once (katman onbellegi)
COPY package*.json ./
RUN npm ci

# Kaynaklar
COPY . .

# Uretim derlemesi
RUN npm run build

# ------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]