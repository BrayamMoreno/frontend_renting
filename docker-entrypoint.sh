#!/bin/sh
set -e

ENV_FILE="/usr/share/nginx/html/env.js"

API_URL_VAL="${API_URL:-http://localhost:8000/api}"
GOOGLE_CLIENT_ID_VAL="${GOOGLE_CLIENT_ID:-}"

cat <<EOF > "$ENV_FILE"
// Configuración dinámica del entorno generada en tiempo de ejecución (Docker)
(function (window) {
  window.__env = window.__env || {};
  window.__env.apiUrl = '${API_URL_VAL}';
  window.__env.googleClientId = '${GOOGLE_CLIENT_ID_VAL}';
})(this);
EOF

echo "[docker-entrypoint] public/env.js actualizado en Nginx con variables del contenedor."

exec "$@"
