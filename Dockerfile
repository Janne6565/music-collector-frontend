FROM oven/bun:1 AS build
WORKDIR /build
COPY package.json bun.lock* .npmrc ./
# The shared package lives on GitHub Packages, which needs a token even though it is
# public. Mounted as a secret rather than passed as a build-arg, so it never lands in a
# layer of the published image.
RUN --mount=type=secret,id=npm_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" bun install --frozen-lockfile
COPY . .
RUN bun run build

# Unprivileged variant: runs as UID 101 and keeps its temp paths under /tmp, so the
# container needs no CHOWN capability and no writable /var mounts.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 8080
