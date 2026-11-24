import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const output = 'dist/owner-app'
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp('dist-owner', output, { recursive: true })

for (const filename of ['index.html', 'owner.html']) {
  const path = `${output}/${filename}`
  let html
  try {
    html = await readFile(path, 'utf8')
  } catch {
    continue
  }
  html = html
    .replaceAll('src="/assets/', 'src="/owner-app/assets/')
    .replaceAll('href="/assets/', 'href="/owner-app/assets/')
  await writeFile(path, html, 'utf8')
}

let revision = 'local'
try {
  revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {
  revision = `build-${Date.now()}`
}

const manifest = {
  version: revision,
  webVersion: `${revision}-${Date.now()}`,
  publishedAt: new Date().toISOString(),
  entry: '/owner-app/',
  assets: '/owner-app/',
}

await writeFile(`${output}/update.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
