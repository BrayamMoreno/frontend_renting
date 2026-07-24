#!/bin/sh
set -e

# Detectar directorio de archivos estáticos (Nginx o Node serve)
if [ -d "/usr/share/nginx/html" ]; then
  ENV_DIR="/usr/share/nginx/html"
else
  ENV_DIR="${ENV_DIR:-/app/browser}"
fi

if [ ! -d "$ENV_DIR" ]; then
  mkdir -p "$ENV_DIR"
fi

# Garantizar que exista index.html (Angular SSR genera index.csr.html)
if [ -f "$ENV_DIR/index.csr.html" ] && [ ! -f "$ENV_DIR/index.html" ]; then
  cp "$ENV_DIR/index.csr.html" "$ENV_DIR/index.html"
  echo "[docker-entrypoint] Copiado index.csr.html -> index.html para soporte de SPA."
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


