import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import ts from 'typescript';
const mobile = new URL('../', import.meta.url);
const source = await readFile(new URL('src/utils/theme.ts', mobile), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { COLORS, LAYOUT, FORM, FONTS } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const luminance = (color) => color.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('common text, headers and primary actions have readable contrast', () => {
  for (const [foreground, background] of [[COLORS.text, COLORS.background], [COLORS.textSecondary, COLORS.white], [COLORS.text, COLORS.primary], [COLORS.white, COLORS.headerBg], [COLORS.white, COLORS.brand]]) assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background}`);
});
test('shared form controls preserve touch size and readable input text', () => {
  assert.ok(LAYOUT.touchTarget >= 44);
  assert.ok(FORM.input.minHeight >= 48);
  assert.ok(FORM.button.minHeight >= 48);
  assert.equal(FORM.input.fontSize, 16);
  assert.equal(FORM.input.borderRadius, FORM.button.borderRadius);
  assert.equal(FORM.input.fontFamily, FONTS.body);
});
test('authenticated screens use the shared header or shared public profile', async () => {
  const files = [];
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (entry.name !== 'auth') await visit(new URL(`${entry.name}/`, folder)); }
      else if (entry.name.endsWith('Screen.tsx')) files.push(new URL(entry.name, folder));
    }
  }
  await visit(new URL('src/screens/', mobile));
  for (const file of files) assert.match(await readFile(file, 'utf8'), /ScreenHeader|PublicTechnicianProfileView/, file.pathname);
  const navigation = await readFile(new URL('src/navigation/RootNavigator.tsx', mobile), 'utf8');
  assert.ok(!navigation.includes('headerShown: true'), 'No second native header above the shared one');
});
test('the embedded workspace ships native theme tokens and offline fonts', async () => {
  const manifest = JSON.parse(await readFile(new URL('src/design/designManifest.json', mobile)));
  assert.ok(manifest.nativeInputs['apps/mobile/src/utils/theme.ts']);
  assert.equal(Object.keys(manifest.nativeInputs).filter((file) => file.endsWith('.ttf')).length, 3);
  const bundle = await readFile(new URL('src/design/designBundle.js', mobile), 'utf8');
  assert.ok(bundle.includes("font-src data:"));
  assert.ok(bundle.includes('data:font/ttf;base64,'));
  assert.ok(bundle.includes(`--brand:${COLORS.brand}`));
  assert.ok(bundle.includes('UrbanBody'));
});
