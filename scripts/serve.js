const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const envPath = path.resolve(__dirname, '../.env');
const envExamplePath = path.resolve(__dirname, '../.env.example');

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

// Prioridad: process.env.PORT > .env > .env.example > 3000
const port = process.env.PORT || fileEnv.PORT || exampleEnv.PORT || '3000';
const host = process.env.HOST || fileEnv.HOST || exampleEnv.HOST || '0.0.0.0';

console.log(`[serve] Iniciando servidor Angular en el puerto ${port}...`);

const isWin = process.platform === 'win32';
const command = isWin ? 'npx.cmd' : 'npx';
const args = ['ng', 'serve', `--port=${port}`, `--host=${host}`];

if (process.argv.length > 2) {
  args.push(...process.argv.slice(2));
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: port
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
