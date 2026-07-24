const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envExamplePath = path.resolve(__dirname, '../.env.example');
const targetPath = path.resolve(__dirname, '../public/env.js');

function parseEnv(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

const fileEnv = parseEnv(envPath);
const exampleEnv = parseEnv(envExamplePath);

// Prioridad: process.env > .env > .env.example
const apiUrl = process.env.API_URL || fileEnv.API_URL || exampleEnv.API_URL || 'http://localhost:8000/api';
const googleClientId = process.env.GOOGLE_CLIENT_ID || fileEnv.GOOGLE_CLIENT_ID || exampleEnv.GOOGLE_CLIENT_ID || '';
const port = process.env.PORT || fileEnv.PORT || exampleEnv.PORT || '3000';

const envJsContent = `// Configuración dinámica del entorno generada automáticamente desde .env
(function (window) {
  window.__env = window.__env || {};
  window.__env.apiUrl = '${apiUrl.replace(/'/g, "\\'")}';
  window.__env.googleClientId = '${googleClientId.replace(/'/g, "\\'")}';
  window.__env.port = '${port.replace(/'/g, "\\'")}';
})(this);
`;

const publicDir = path.dirname(targetPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(targetPath, envJsContent, 'utf8');
console.log(`[generate-env] public/env.js actualizado desde .env:`);
console.log(`  port: ${port}`);
console.log(`  apiUrl: ${apiUrl}`);
console.log(`  googleClientId: ${googleClientId}`);
