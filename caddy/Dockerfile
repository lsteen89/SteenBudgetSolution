# caddy/Dockerfile
ARG CADDY_VERSION=2.9.1
FROM caddy:${CADDY_VERSION}-builder AS builder
RUN set -eux; ver="${CADDY_VERSION#v}"; xcaddy build "v${ver}" --with github.com/caddy-dns/cloudflare

FROM caddy:${CADDY_VERSION}
COPY --from=builder /usr/bin/caddy /usr/bin/caddy