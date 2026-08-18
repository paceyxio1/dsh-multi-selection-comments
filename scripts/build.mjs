import { build } from 'esbuild'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packageName = 'dsh-plugin-quote-to-chat'

mkdirSync(join(root, 'dist'), { recursive: true })
await build({
  entryPoints: [join(root, 'src/server/index.ts')],
  outfile: join(root, 'dist/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
})

const temporaryClient = join(root, '.tmp-client.js')
await build({
  entryPoints: [join(root, 'src/client/index.tsx')],
  outfile: temporaryClient,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  target: 'es2020',
  minify: true,
  external: [
    'react',
    'react/jsx-runtime',
    '@deepseek-ai/dsh-client-runtime/client',
  ],
  sourcemap: false,
  logLevel: 'info',
})

const body = readFileSync(temporaryClient, 'utf8')
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(packageName)},
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    (function (module, exports, require) {
${body}
    })(module, module.exports, require);
    return module.exports;
  }
});
`
writeFileSync(join(root, 'client.js'), wrapped)
rmSync(temporaryClient, { force: true })

console.log('[build] dist/index.js')
console.log(`[build] client.js (${(wrapped.length / 1024).toFixed(1)} KiB)`)
