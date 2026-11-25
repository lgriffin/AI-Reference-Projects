# syntax=docker/dockerfile:1

# The fixture course's lite site, built and served as static files. Two stages: Node builds the site,
# BusyBox serves it, as a user that is not root, from a file system it cannot write.
#
# The build context is tutors/variants (the parent folder), because the shared fixture lives there:
#
#   docker build -f Dockerfile -t tutors-ladder:1.0.0 \
#     --build-arg VERSION=1.0.0 --build-arg GIT_SHA=$(git rev-parse HEAD) ..
#   docker run --rm --read-only --cap-drop ALL -p 127.0.0.1:8080:8080 tutors-ladder:1.0.0
#
# or `pnpm container:smoke`, which builds, runs and checks it (scripts/container-smoke.ts).
# Mirrors upstream's Dockerfile: base pinned by digest, OCI labels for version and revision, a
# non-root USER, build identity passed in as build arguments and answered by one file.

# ---------------------------------------------------------------------------
# Base images, pinned by digest. A tag can move under the same commit (upstream's Dockerfile records
# node 22.23.3 -> 22.23.4 reaching every image with no PR on 2026-10-22, its Rule 0667); a digest
# cannot. The tag stays beside the digest for people; the digest is what is pulled.
#
# To refresh a pin (its own pull request, never inside a feature):
#   docker buildx imagetools inspect docker.io/library/node:22.23.5-alpine   # "Digest:" line
# and copy the index digest here. tests/release/dockerfile.test.ts fails on a FROM without one,
# and when the Node version here is not the one in .nvmrc.
#
# REGISTRY points at a mirror of Docker Hub's library images when Docker Hub rate-limits you, e.g.
# --build-arg REGISTRY=mirror.gcr.io/library. The digest is the same on a faithful mirror, and a
# mirror that serves other bytes fails the pull: that is what the digest is for.
# ---------------------------------------------------------------------------
ARG REGISTRY=docker.io/library

# ---------------------------------------------------------------------------
# build: run the command on the fixture. The workspace has no third-party runtime dependency, so there
# is nothing to install: the @ladder packages are linked the way pnpm links them, and Node runs the
# TypeScript sources directly.
# ---------------------------------------------------------------------------
FROM ${REGISTRY}/node:22.23.5-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /ladder/rung-7-shipped
COPY fixtures/ladder-sample-course /ladder/fixtures/ladder-sample-course
COPY rung-7-shipped/packages ./packages
COPY rung-7-shipped/apps ./apps
RUN mkdir -p node_modules/@ladder \
 && for p in model gen lite; do ln -s ../../packages/$p node_modules/@ladder/$p; done
# Build identity: answered by /version.json and by nothing else (apps/cli/tests/release.test.ts).
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
RUN GIT_SHA="${GIT_SHA}" BUILD_DATE="${BUILD_DATE}" node apps/cli/src/main.ts /ladder/fixtures/ladder-sample-course /site \
 && GIT_SHA="${GIT_SHA}" node apps/cli/src/main.ts --version

# ---------------------------------------------------------------------------
# runtime: BusyBox httpd and the site. No Node, no package manager, no shell tools beyond BusyBox:
# a static site needs a file server and nothing else, so nothing else can be exploited.
# ---------------------------------------------------------------------------
FROM ${REGISTRY}/busybox:1.37.0@sha256:a7dbc319b1438115a207e11930dc4bb3e643dcb3ec0bdd694bb36cd8fad289ec AS runtime
ARG VERSION=unknown
ARG GIT_SHA=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="tutors-ladder" \
      org.opencontainers.image.description="Tutors ladder rung 7: the fixture course as a static lite site" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="MIT"

# Owned by root and only readable by the server's user, so the server cannot change what it serves.
COPY --from=build /site /site

# Not root. A numeric UID, so Kubernetes' runAsNonRoot can verify it without reading /etc/passwd.
USER 10001:10001
EXPOSE 8080

# The runtime has wget (BusyBox) but no curl; it asks for the build identity file.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/version.json"]

CMD ["httpd", "-f", "-p", "8080", "-h", "/site"]
