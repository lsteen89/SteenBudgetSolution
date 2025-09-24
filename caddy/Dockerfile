# caddy/Dockerfile
ARG CADDY_VERSION=2.9.1
FROM caddy:${CADDY_VERSION}-builder AS builder
RUN set -eux; ver="${CADDY_VERSION#v}"; xcaddy build "v${ver}" --with github.com/caddy-dns/cloudflare

FROM caddy:${CADDY_VERSION}
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Create a non-root user
RUN addgroup -S app && adduser -S app -G app -u 10001
USER 10001

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD curl -f http://127.0.0.1:2019/metrics || curl -f http://127.0.0.1/ || exit 1