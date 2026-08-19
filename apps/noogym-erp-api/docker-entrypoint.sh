#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  node node_modules/prisma/build/index.js migrate deploy
fi

if [ "${RUN_SUPER_ADMIN_BOOTSTRAP:-false}" = "true" ]; then
  node node_modules/ts-node/dist/bin.js prisma/bootstrap-super-admin.ts
fi

exec "$@"
