#!/bin/sh
set -e

ENV_DIR="${ENV_DIR:-/app/browser}"
if [ ! -d "$ENV_DIR" ]; then
  mkdir -p "$ENV_DIR"
fi
ENV_FILE="$ENV_DIR/env.js"

API_URL_VAL="${API_URL:-http://localhost:8000/api}"
GOOGLE_CLIENT_ID_VAL="${GOOGLE_CLIENT_ID:-}"
PORT_VAL="${PORT:-3000}"

cat <<EOF > "$ENV_FILE"
// Configuración dinámica del entorno generada en tiempo de ejecución (Docker)
(function (window) {
  window.__env = window.__env || {};
  window.__env.apiUrl = '${API_URL_VAL}';
  window.__env.googleClientId = '${GOOGLE_CLIENT_ID_VAL}';
  window.__env.port = '${PORT_VAL}';
})(this);
EOF

echo "[docker-entrypoint] env.js actualizado en $ENV_FILE con variables del contenedor."

exec "$@"

