FROM node:22-slim

# O rosto de cada recem-nascido e desenhado pelo Gemini e padronizado em
# Python/Pillow. Sem os dois runtimes na imagem, os filhos nascem sem cara.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pil ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

CMD ["node", "src/server.js"]
