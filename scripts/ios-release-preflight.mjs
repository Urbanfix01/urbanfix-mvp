import fs from 'node:fs';
import path from 'node:path';

const readJson = (filePath) => {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(raw);
};

const parseArgs = (argv) => {
  const args = {
    targetVersion: '',
    targetBuild: '',
    strictSemver: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--target-version') {
      args.targetVersion = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (current === '--target-build') {
      args.targetBuild = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (current === '--strict-semver') {
      args.strictSemver = true;
    }
  }

  return args;
};

const normalizeVersion = (raw, strictSemver, issues) => {
  const value = String(raw || '').trim();
  if (/^\d+\.\d+\.\d+$/.test(value)) {
    return value;
  }
  if (/^\d+\.\d+$/.test(value)) {
    const normalized = `${value}.0`;
    if (strictSemver) {
      issues.errors.push(`Version invalida: "${value}". Usa formato X.Y.Z.`);
    } else {
      issues.warnings.push(`Version "${value}" normalizada a "${normalized}" (falta patch).`);
    }
    return normalized;
  }

  issues.errors.push(`Version invalida: "${value}". Usa formato X.Y.Z.`);
  return '';
};

const compareSemver = (a, b) => {
  const pa = a.split('.').map((part) => Number(part));
  const pb = b.split('.').map((part) => Number(part));
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
};

const toPositiveInt = (value) => {
  const parsed = Number(String(value || '').trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const issues = {
  errors: [],
  warnings: [],
};

const args = parseArgs(process.argv.slice(2));
const appConfig = readJson('apps/mobile/app.json');
const easConfig = readJson('apps/mobile/eas.json');

const expo = appConfig?.expo || {};
const ios = expo?.ios || {};
const easBuild = easConfig?.build || {};
const easSubmit = easConfig?.submit || {};

const currentVersion = normalizeVersion(expo.version, args.strictSemver, issues);
const currentBuild = toPositiveInt(ios.buildNumber);

if (!currentBuild) {
  issues.errors.push(`ios.buildNumber invalido: "${ios.buildNumber}". Debe ser entero positivo.`);
}

if (!ios.bundleIdentifier || typeof ios.bundleIdentifier !== 'string') {
  issues.errors.push('Falta ios.bundleIdentifier en apps/mobile/app.json.');
}

if (!expo.owner || typeof expo.owner !== 'string') {
  issues.errors.push('Falta expo.owner en apps/mobile/app.json.');
}

if (!expo?.extra?.eas?.projectId) {
  issues.errors.push('Falta expo.extra.eas.projectId en apps/mobile/app.json.');
}

if (!easBuild.production || !easBuild.production.ios) {
  issues.errors.push('Falta build.production.ios en apps/mobile/eas.json.');
}

if (!easSubmit.production || !easSubmit.production.ios?.ascAppId) {
  issues.errors.push('Falta submit.production.ios.ascAppId en apps/mobile/eas.json.');
}

if (args.targetVersion) {
  const normalizedTargetVersion = normalizeVersion(args.targetVersion, true, issues);
  if (currentVersion && normalizedTargetVersion && currentVersion !== normalizedTargetVersion) {
    const relation = compareSemver(currentVersion, normalizedTargetVersion);
    const hint =
      relation < 0
        ? 'actualiza apps/mobile/app.json antes de release'
        : 'revisa que el target sea correcto';
    issues.errors.push(
      `Version actual ${currentVersion} no coincide con target ${normalizedTargetVersion} (${hint}).`
    );
  }
}

if (args.targetBuild) {
  const targetBuild = toPositiveInt(args.targetBuild);
  if (!targetBuild) {
    issues.errors.push(`--target-build invalido: "${args.targetBuild}".`);
  } else if (currentBuild && currentBuild !== targetBuild) {
    issues.errors.push(
      `Build actual ${currentBuild} no coincide con target ${targetBuild} (actualiza ios.buildNumber).`
    );
  }
}

console.log('iOS Release Preflight');
console.log(`- Version: ${expo.version || 'N/A'}${currentVersion ? ` (normalized: ${currentVersion})` : ''}`);
console.log(`- iOS buildNumber: ${ios.buildNumber || 'N/A'}`);
console.log(`- iOS bundleIdentifier: ${ios.bundleIdentifier || 'N/A'}`);
console.log(`- EAS projectId: ${expo?.extra?.eas?.projectId || 'N/A'}`);
console.log(`- EAS submit ascAppId: ${easSubmit?.production?.ios?.ascAppId || 'N/A'}`);

if (issues.warnings.length) {
  console.log('\nWarnings:');
  issues.warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (issues.errors.length) {
  console.error('\nPreflight FAILED:');
  issues.errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('\nPreflight OK');
