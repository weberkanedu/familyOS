# Aile Panosu - Dokploy / herhangi bir Docker host icin tek parca imaj
# (uygulama + gercek zamanli senkron + kalici veri + gunluk yedek)
#
#   docker build -t ailepanosu .
#   docker run -p 3000:3000 -e FAMILY_CODE=gizli-kod -v ailepanosu-data:/data ailepanosu
#
# Zorunlu ortam degiskeni: FAMILY_CODE   Kalici klasor: /data

FROM node:22-alpine AS build
WORKDIR /app

# Bagimliliklar once (katman onbellegi)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Kaynaklar + uretim derlemesi (dist/ + server-dist/index.cjs)
COPY . .
RUN npm run build

# ------------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    DIST_DIR=/app/dist
WORKDIR /app

# Sunucu tek dosyaya paketlendi: node_modules gerekmez
COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist

# root olmayan kullanici; veri klasoru ona ait
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

CMD ["node", "server-dist/index.cjs"]
