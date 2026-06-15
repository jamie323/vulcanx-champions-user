# ─────────────────────────────────────────────────────────────────────────────
# VulcanX Champions — static site
#
# This is a pure HTML/JS SPA with no build step.
# nginx:alpine serves the static assets directly.
# ─────────────────────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Remove the default nginx placeholder page.
RUN rm -rf /usr/share/nginx/html/*

# Copy only the web-facing assets — excludes scripts/, allbloodlines*,
# .git/, .claude/, etc. (see .dockerignore).
# 2026-05-27 — evolution20/ MUST be included: bloodlines.json points
# every champion stage's `img` field at evolution20/<species>/<bloodline>/sNN.png
# (520 PNGs). Previously excluded → champions.vulcan-x.io rendered all
# Ironfang/orc/etc stages as broken images.
COPY index.html        /usr/share/nginx/html/
COPY wallet.js         /usr/share/nginx/html/
COPY auth.js           /usr/share/nginx/html/
COPY stories.js        /usr/share/nginx/html/
COPY equipment.js      /usr/share/nginx/html/
COPY bloodlines.json   /usr/share/nginx/html/
COPY hype.mp4          /usr/share/nginx/html/
COPY vulcanx/          /usr/share/nginx/html/vulcanx/
COPY evolution/        /usr/share/nginx/html/evolution/
COPY evolution20/      /usr/share/nginx/html/evolution20/
COPY howto/            /usr/share/nginx/html/howto/
COPY icons/            /usr/share/nginx/html/icons/
COPY img/              /usr/share/nginx/html/img/
COPY nft_images/       /usr/share/nginx/html/nft_images/
COPY adventures/       /usr/share/nginx/html/adventures/

# ─── Bake the Vulcan-X gateway URL into index.html at image-build time ────
# index.html ships `'https://dev-new-api.vulcan-x.io'` as the default
# fallback for window.__VX_GATEWAY_URL__ (used when the request host is
# NOT localhost / 127.x — the inline script in index.html handles the
# local-dev override automatically). For non-default deploys (staging,
# prod cutover) swap the URL via the build arg:
#   docker build --build-arg VX_GATEWAY_URL=https://api.vulcan-x.io …
# Leaving the build arg unset keeps the dev-new default below.
ARG VX_GATEWAY_URL=https://dev-new-api.vulcan-x.io
RUN sed -i "s|'https://dev-new-api.vulcan-x.io'|'${VX_GATEWAY_URL}'|g" /usr/share/nginx/html/index.html

# ─── Bust asset cache on every build ──────────────────────────────────────
# Replace every ?v=<anything> query string in index.html with the current
# UTC build timestamp so browsers always fetch the latest JS files after a
# redeploy. No manual version bumps needed.
RUN BUILD_TS=$(date -u +%Y%m%d%H%M) && \
    sed -i "s/?v=[^\"'&]*/\?v=${BUILD_TS}/g" /usr/share/nginx/html/index.html

# Drop in our custom nginx config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx runs in the foreground by default when CMD is "nginx -g daemon off;"
# The base image already sets this as the default CMD, but we make it explicit.
CMD ["nginx", "-g", "daemon off;"]
