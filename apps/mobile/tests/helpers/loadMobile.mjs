import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

export async function loadMobile(file, mocks = {}, extraResolve) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(file, new URL('../../', import.meta.url)))], bundle: true, platform: 'node', format: 'esm', write: false, loader: { '.png': 'dataurl' },
    plugins: [{ name: 'isolated-mobile-module', setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (Object.hasOwn(mocks, args.path)) return { path: args.path, namespace: 'fixture' };
        if (args.path === 'react') return { path: import.meta.resolve('react'), external: true };
        return extraResolve?.(args) || null;
      });
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: mocks[path] }));
    } }],
  });
  const source = result.outputFiles[0].text + `\n//# sourceURL=mobile-unit://${file}\n`;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
