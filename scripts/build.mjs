import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('lib', { recursive: true });
await build({ entryPoints: ['src/index.ts'], outfile: 'lib/index.js', bundle: true,
  platform: 'node', target: 'node24', format: 'esm', packages: 'external', sourcemap: true });
// Harness's documented lazy factory protocol. Only React is external and is
// resolved from the existing platform table, never shipped as a second copy.
const client = await build({ entryPoints: ['src/client.ts'], bundle: true,
  platform: 'browser', target: 'es2022', format: 'cjs', external: ['react'], write: false });
await writeFile('lib/client.js', `window.__ModuleLoader__.load({id:"dsh-tailseek",factory(require){const module={exports:{}};const exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports;}});\n`);
console.log('Built Host ESM and Harness Client factory.');
