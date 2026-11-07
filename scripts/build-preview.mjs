// Build the engine as a single IIFE bundle for the local galaxy-06 preview.
// Usage: PREVIEW_OUT=".../design-preview/galaxy-06" npm run build:preview
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(process.env.PREVIEW_OUT || 'dist-preview');
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve('src/stellar/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'StellarConsole',
  outfile: resolve(outDir, 'stellar-console.js'),
  loader: { '.css': 'css' },
  minify: true,
  target: ['es2020'],
  legalComments: 'none',
});
console.log(`preview bundle written to ${outDir}`);
