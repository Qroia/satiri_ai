# Этап сборки
FROM node:18-alpine AS builder
WORKDIR /app
# Установка зависимостей, копирование и запуск сборки
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Финальный образ
FROM node:18-alpine
WORKDIR /app
# Устанавливаем необходимые пакеты для работы с сетью
RUN apk add --no-cache iptables redsocks ffmpeg
# Копируем собранные файлы и package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
# Копируем файл конфигурации redsocks
COPY redsocks.conf /etc/redsocks.conf
# Запуск iptables с proxy редиректом
CMD sh -c "\
  iptables -t nat -A OUTPUT -p tcp -j REDIRECT --to-ports 12345 && \
  redsocks -c /etc/redsocks.conf && \
  node dist/index.js"
