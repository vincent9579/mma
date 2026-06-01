#!/usr/bin/env bash
# Rebuild the e2e Docker image (needed after app source changes -- the test binary
# is baked in). Uses --progress=plain and tees output to build-e2e.log so build
# progress is actually captured (BuildKit's default TTY output doesn't pipe cleanly).
set -uo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker-compose.e2e.yml build --progress=plain e2e 2>&1 | tee build-e2e.log
