# ─────────────────────────────────────────────────────────────────────────────
# VulcanX Champions — static site
#
# This is a pure HTML/JS SPA with no build step.
# nginx:alpine serves the static assets directly.
# ─────────────────────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Remove the default nginx placeholder page.
RUN rm -rf /usr/share/nginx/html/*

# Copy only the web-facing assets — excludes scripts/, evolution20/,
# allbloodlines*, .git/, .claude/, etc. (see .dockerignore).
COPY index.html        /usr/share/nginx/html/
COPY wallet.js         /usr/share/nginx/html/
COPY stories.js        /usr/share/nginx/html/
COPY equipment.js      /usr/share/nginx/html/
COPY bloodlines.json   /usr/share/nginx/html/
COPY hype.mp4          /usr/share/nginx/html/
COPY vulcanx/          /usr/share/nginx/html/vulcanx/
COPY evolution/        /usr/share/nginx/html/evolution/
COPY howto/            /usr/share/nginx/html/howto/
COPY icons/            /usr/share/nginx/html/icons/
COPY img/              /usr/share/nginx/html/img/
COPY nft_images/       /usr/share/nginx/html/nft_images/

# Drop in our custom nginx config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx runs in the foreground by default when CMD is "nginx -g daemon off;"
# The base image already sets this as the default CMD, but we make it explicit.
CMD ["nginx", "-g", "daemon off;"]
