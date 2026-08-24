FROM oven/bun:1 AS build
WORKDIR /build
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Unprivileged variant: runs as UID 101 and keeps its temp paths under /tmp, so the
# container needs no CHOWN capability and no writable /var mounts.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 8080
