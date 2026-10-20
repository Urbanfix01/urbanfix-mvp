// Generate the shipped, offline editor from the canonical web engine, not apps/web.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const web = path.resolve(process.env.URBANFIX_WEB_ROOT || path.join(root, '../..'));
const requireWeb = createRequire(path.join(web, 'package.json'));
const esbuild = requireWeb('esbuild'), postcss = requireWeb('postcss'), tailwind = requireWeb('tailwindcss');
const entry = path.join(root, 'apps/mobile/embedded-design/Entry.jsx');
const alias = {
  '@/api/quotationCatalog': path.join(root, 'apps/mobile/embedded-design/adapters.js'),
  '@/api/priceReview': path.join(root, 'apps/mobile/embedded-design/adapters.js'),
  '@/lib/AuthContext': path.join(root, 'apps/mobile/embedded-design/adapters.js'),
};
const result = await esbuild.build({ entryPoints: [entry], bundle: true, write: false, minify: true, format: 'iife', target: ['es2020'], metafile: true,
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'canonical-web', setup(build) {
    build.onResolve({ filter: /^@\// }, ({ path: id }) => ({ path: alias[id] || path.join(web, 'src', id.slice(2)) + (path.extname(id) ? '' : '.js') }));
    // Canonical React components are JSX; extensionless aliases must resolve that extension.
    build.onResolve({ filter: /^(react($|\/)|react-dom($|\/)|@tanstack\/react-query$|lucide-react$)/ }, ({ path: id }) => ({ path: requireWeb.resolve(id) }));
  } }] });
const inputs = Object.keys(result.metafile.inputs).map((file) => path.resolve(file));
const themePath = path.join(root, 'apps/mobile/src/utils/theme.ts');
const themeModule = await esbuild.transform(await readFile(themePath, 'utf8'), { loader: 'ts', format: 'esm' });
const { COLORS, LAYOUT } = await import(`data:text/javascript;base64,${Buffer.from(themeModule.code).toString('base64')}`);
const fonts = [
  ['UrbanBody', 'raleway/400Regular/Raleway_400Regular.ttf', 400],
  ['UrbanBody', 'raleway/600SemiBold/Raleway_600SemiBold.ttf', 600],
  ['UrbanTitle', 'montserrat/700Bold/Montserrat_700Bold.ttf', 700],
];
const fontPaths = fonts.map(([, file]) => path.join(root, 'apps/mobile/node_modules/@expo-google-fonts', file));
let fontCss = '';
for (let i = 0; i < fonts.length; i++) fontCss += `@font-face{font-family:${fonts[i][0]};font-weight:${fonts[i][2]};font-display:swap;src:url(data:font/ttf;base64,${(await readFile(fontPaths[i])).toString('base64')}) format('truetype')}`;
const tokens = `:root{--brand:${COLORS.brand};--ink:${COLORS.text};--muted:${COLORS.textSecondary};--paper:${COLORS.background};--border:${COLORS.border};--accent:${COLORS.primary};--soft:${COLORS.surfaceMuted};--control-radius:${LAYOUT.controlRadius}px;--control-height:${LAYOUT.controlHeight}px}`;
const css = await postcss([tailwind({ content: inputs.filter((p) => /\.(jsx|js)$/.test(p)), corePlugins: { preflight: true }, theme: { extend: {} } })])
  .process('@tailwind base;@tailwind components;@tailwind utilities;\n' + await readFile(path.join(root, 'apps/mobile/embedded-design/workspace.css'), 'utf8'), { from: undefined });
const palette = { '#006e68': 'var(--brand)', '#536e76': 'var(--muted)', '#26444c': 'var(--ink)', '#d5dfdf': 'var(--border)', '#e3f1ee': 'var(--soft)', '#f6f8f8': 'var(--paper)' };
css.root.walkDecls((declaration) => { declaration.value = declaration.value.replace(/#(?:006e68|536e76|26444c|d5dfdf|e3f1ee|f6f8f8)\b/gi, (color) => palette[color.toLowerCase()]); });
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const scriptHash = createHash('sha256').update(script).digest('base64');
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><meta http-equiv="Content-Security-Policy" content="default-src 'none';script-src 'sha256-${scriptHash}';style-src 'unsafe-inline';font-src data:;img-src data: blob: https://jfqutuptbrgtwbofpawp.supabase.co;connect-src 'none';form-action 'none';base-uri 'none'"><style>${fontCss}${tokens}${css.root.toString()}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
const out = path.join(root, 'apps/mobile/src/design'); await mkdir(out, { recursive: true });
const manifest = { webCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: web, encoding: 'utf8' }).trim(), generatedAt: new Date().toISOString(),
  nativeInputs: Object.fromEntries(await Promise.all([...inputs.filter((file) => file.startsWith(path.join(root, 'apps/mobile/embedded-design') + path.sep)), path.join(root, 'apps/mobile/embedded-design/workspace.css'), themePath, ...fontPaths].sort().map(async (file) => [path.relative(root, file).replaceAll('\\', '/'), createHash('sha256').update(await readFile(file)).digest('hex')]))),
  inputs: Object.fromEntries(await Promise.all(inputs.filter((file) => file.startsWith(path.join(web, 'src') + path.sep)).sort().map(async (file) => [path.relative(web, file).replaceAll('\\', '/'), createHash('sha256').update(await readFile(file)).digest('hex')]))),
  htmlSha256: createHash('sha256').update(html).digest('hex'), bytes: Buffer.byteLength(html) };
await writeFile(path.join(out, 'designBundle.js'), `// Generated by scripts/build-design-workspace.mjs. Do not edit.\nexport default ${JSON.stringify(html)};\n`);
await writeFile(path.join(out, 'designManifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ bytes: manifest.bytes, sharedFiles: Object.keys(manifest.inputs).length, webCommit: manifest.webCommit }));
