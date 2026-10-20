// Render illustrative work previews with the canonical construction models.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const web = path.resolve(process.env.URBANFIX_WEB_ROOT || path.join(root, '../..'));
const requireWeb = createRequire(path.join(web, 'package.json'));
const { build } = requireWeb('esbuild');
const moduleAt = (file) => JSON.stringify(path.join(web, 'src/lib', file));
const workSource = JSON.stringify(path.join(root, 'apps/mobile/embedded-design/workScenes.js'));
const entry = `
import * as THREE from 'three';
import { WORK_SCENE_IDS, buildWorkScene } from ${workSource};
import { createConstructionMaterialScene, fitConstructionMaterialCamera } from ${moduleAt('pipeMaterialScene.js')};
import { disposeMaterialModel } from ${moduleAt('constructionMaterialModel.js')};
window.captureWork = () => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(320, 240); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = createConstructionMaterialScene(), camera = new THREE.PerspectiveCamera(38, 4 / 3, .01, 100), images = [];
  try {
    for (const id of WORK_SCENE_IDS) {
      const model = buildWorkScene(id);
      const resources = new Set();
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      if (bounds.isEmpty() || bounds.getCenter(new THREE.Vector3()).length() > .001) throw new Error('Empty or uncentered work scene: ' + id);
      model.traverse((node) => {
        if (!node.isMesh) return;
        for (const value of node.geometry.attributes.position.array) if (!Number.isFinite(value)) throw new Error('Invalid geometry: ' + id);
        resources.add(node.geometry);
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          resources.add(material); if (material.map) resources.add(material.map); if (material.bumpMap) resources.add(material.bumpMap);
        }
      });
      try {
        scene.add(model); fitConstructionMaterialCamera(camera, model); renderer.render(scene, camera);
        const gl = renderer.getContext(), pixels = new Uint8Array(320 * 240 * 4);
        gl.readPixels(0, 0, 320, 240, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let changed = 0, edge = false;
        for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) {
          const p = (y * 320 + x) * 4;
          if (Math.abs(pixels[p] - pixels[0]) + Math.abs(pixels[p + 1] - pixels[1]) + Math.abs(pixels[p + 2] - pixels[2]) > 30) {
            changed++; if (x < 2 || x > 317 || y < 2 || y > 237) edge = true;
          }
        }
        if (changed < 384 || edge) throw new Error('Blank or clipped work preview: ' + id);
        images.push({ id, changed, data: renderer.domElement.toDataURL('image/webp', .92) });
      } finally {
        scene.remove(model); let disposed = 0; resources.forEach((r) => r.addEventListener('dispose', () => disposed++)); disposeMaterialModel(model);
        if (disposed !== resources.size) throw new Error('Incomplete disposal: ' + id);
      }
    }
    return images;
  } finally { renderer.dispose(); renderer.forceContextLoss(); }
};`;
const bundle = await build({ stdin: { contents: entry, resolveDir: web }, bundle: true, write: false, format: 'iife', target: 'es2020', metafile: true,
  plugins: [{ name: 'canonical-work-models', setup(build) { build.onResolve({ filter: /^@\// }, ({ path: id }) => ({ path: path.join(web, 'src', id.slice(2)) })); } }] });
assert.ok(process.env.PLAYWRIGHT_MODULE && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, 'Configure isolated Playwright');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true, args: ['--enable-unsafe-swiftshader'] });
let images;
try {
  const context = await browser.newContext();
  await context.route('**/*', (route) => route.request().url() === 'http://127.0.0.1:4359/work-preview'
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }) : route.abort());
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4359/work-preview');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  images = await page.evaluate(() => window.captureWork());
} finally { await browser.close(); }
const assets = path.join(root, 'apps/mobile/assets/work-renders'), output = path.join(root, 'apps/mobile/src/materials');
await mkdir(assets, { recursive: true });
const hashes = {}, imports = [];
for (const { id, data, changed } of images) {
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  await writeFile(path.join(assets, `${id}.webp`), bytes);
  hashes[id] = { sha256: createHash('sha256').update(bytes).digest('hex'), visiblePixels: changed };
  imports.push(`  ${JSON.stringify(id)}: require('../../assets/work-renders/${id}.webp'),`);
}
const inputs = {};
for (const file of Object.keys(bundle.metafile.inputs)) {
  const absolute = path.resolve(file);
    if (absolute.startsWith(path.join(web, 'src') + path.sep)) inputs[path.relative(web, absolute).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(absolute)).digest('hex');
}
inputs['mobile/embedded-design/workScenes.js'] = createHash('sha256').update(await readFile(path.join(root, 'apps/mobile/embedded-design/workScenes.js'))).digest('hex');
await writeFile(path.join(output, 'workPreviews.ts'), `// Generated by scripts/generate-work-previews.mjs. Do not edit.\nimport type { ImageSourcePropType } from 'react-native';\nexport const workPreviews: Record<string, ImageSourcePropType> = {\n${imports.join('\n')}\n};\n`);
await writeFile(path.join(output, 'workPreviewManifest.json'), JSON.stringify({ images: hashes, inputs }, null, 2) + '\n');
console.log(JSON.stringify({ generatedWorkPreviews: images.length }));
