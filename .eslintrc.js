let baseExtends = 'universe';

try {
  require.resolve('eslint-config-universe');
} catch (_error) {
  baseExtends = 'next/core-web-vitals';
}

module.exports = {
  extends: baseExtends,
  root: true,
  rules: {
    // Aquí agregaremos reglas custom si hacen falta.
    // Por ahora, confiamos en el estándar de Universe.
    'no-console': 'warn', // Avisar si dejamos console.log olvidados
  },
};
