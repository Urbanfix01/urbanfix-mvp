import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const generated = await readFile(new URL('../src/design/designBundle.js', import.meta.url), 'utf8');
const html = JSON.parse(generated.slice(generated.indexOf('export default ') + 15).trim().replace(/;$/, ''));
const manifest = JSON.parse(await readFile(new URL('../src/design/designManifest.json', import.meta.url), 'utf8'));
test('the shipped editor has a verified script and no remote scripts or credential client', () => {
  assert.equal(createHash('sha256').update(html).digest('hex'), manifest.htmlSha256);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.ok(html.includes(`script-src 'sha256-${createHash('sha256').update(script).digest('base64')}'`));
  assert.ok(html.includes("connect-src 'none'")); assert.ok(!/<script\s+src=/i.test(html));
  assert.ok(!Object.keys(manifest.inputs).some((p) => /supabaseClient|base44Client|platformConfig|api\//.test(p)));
  assert.ok(Object.keys(manifest.inputs).includes('src/lib/houseDrawing.js'));
  assert.ok(Object.keys(manifest.inputs).includes('src/lib/materialQuotation.js'));
});
test('the renderer bridge does not transfer the native access token', async () => {
  const source = await readFile(new URL('../src/design/DesignWorkspaceScreen.tsx', import.meta.url), 'utf8');
  assert.ok(!source.includes('access_token')); assert.ok(!source.includes('setSession'));
  const surface = await readFile(new URL('../src/design/DesignSurface.native.tsx', import.meta.url), 'utf8');
  assert.ok(surface.includes("request.url === 'about:blank'")); assert.ok(surface.includes('sharedCookiesEnabled={false}'));
  const web = await readFile(new URL('../src/design/DesignSurface.tsx', import.meta.url), 'utf8');
  assert.ok(web.includes('sandbox="allow-scripts"')); assert.ok(!web.includes('allow-same-origin'));
  assert.ok(web.includes('onLoad={() => callback.current(JSON.stringify({ version: 1, type: \'ready\' }))}'), 'The sandbox can recover from an early ready notification');
});

test('the local work-scene sources match the shipped renderer', async () => {
  assert.ok(manifest.nativeInputs?.['apps/mobile/embedded-design/workScenes.js']);
  for (const [file, digest] of Object.entries(manifest.nativeInputs)) assert.equal(createHash('sha256').update(await readFile(new URL(`../../../${file}`, import.meta.url))).digest('hex'), digest, file);
});
test('all shared source files still match the canonical source snapshot', { skip: !process.env.URBANFIX_WEB_ROOT }, async () => {
  for (const [file, digest] of Object.entries(manifest.inputs)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(process.env.URBANFIX_WEB_ROOT, file))).digest('hex'), digest, `Rebuild the local engine after changing ${file}`);
  }
});
