const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const routePath = path.join(appRoot, 'app', 'api', 'auth', 'session', 'route.ts');

const failures = [];

if (!fs.existsSync(routePath)) {
  failures.push('app/api/auth/session/route.ts no encontrado.');
} else {
  const source = fs.readFileSync(routePath, 'utf8');
  const requiredMarkers = [
    'readLimitedJsonBody',
    'isSameOriginRequest',
    "httpOnly: true",
    "sameSite: 'lax'",
    "secure: process.env.NODE_ENV === 'production'",
    "path: '/'",
    'maxAge: COOKIE_MAX_AGE_SECONDS',
    'maxAge: 0',
    'accessToken.length < 20',
  ];

  requiredMarkers.forEach((marker) => {
    if (!source.includes(marker)) {
      failures.push(`falta ${marker}`);
    }
  });

  if (source.includes('request.json()')) {
    failures.push('no debe leer JSON sin limite con request.json().');
  }

  if (source.includes('cookies.delete')) {
    failures.push('debe borrar la cookie con las mismas opciones de seguridad.');
  }
}

if (failures.length > 0) {
  console.error('Cookie de sesion incompleta:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Cookie de sesion sin bloqueos.');
