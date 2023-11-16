FROM node:20.4 AS builder

ARG SEALOS_LANG=zh-Hans
ARG BD_TOKEN
ENV BD_TOKEN=$BD_TOKEN

WORKDIR /app

COPY . /app

WORKDIR /app/website

RUN ls -lh i18n/zh-Hans/docusaurus-plugin-content-blog/

RUN head -50 i18n/zh-Hans/docusaurus-plugin-content-blog/2023/06/sealos-release.md

RUN yarn install

RUN yarn run build

FROM fholzer/nginx-brotli:latest

COPY --from=builder /app/website/build /usr/share/nginx/html
