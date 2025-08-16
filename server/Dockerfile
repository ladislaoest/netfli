FROM node:18

# Configurar el idioma
ENV LANG=es_ES.UTF-8
ENV LANGUAGE=es_ES
ENV LC_ALL=es_ES.UTF-8

# Instalar soporte para español
RUN apt-get update && apt-get install -y locales && \
    sed -i -e 's/# es_ES.UTF-8 UTF-8/es_ES.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=10000
ENV JWT_SECRET=supersecret
ENV MOVIES_DIR=/app/movies

EXPOSE 10000

CMD ["node", "index.js"]
