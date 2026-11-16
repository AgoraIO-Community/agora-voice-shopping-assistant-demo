import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const artifactIndex = args.indexOf('--tarball');
const tarball = artifactIndex < 0 ? path.join(root, 'dist', `${pkg.name}-${pkg.version}.tgz`) : path.resolve(args[artifactIndex + 1]);
if (artifactIndex < 0) execFileSync(process.execPath, ['scripts/npm/build.mjs'], { cwd: root, stdio: 'inherit' });
const temp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'shopping-npm-')));
const cache = path.join(temp, 'cache');
const run = (...cliArgs) => spawnSync('npm', ['exec', '--offline', '--yes', '--cache', cache, `--package=${tarball}`, '--', pkg.name, ...cliArgs], { cwd: temp, encoding: 'utf8' });
const success = (...cliArgs) => {
  const result = run(...cliArgs);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
};
let passed = false;
try {
  assert.equal(success('--version').trim(), pkg.version);
  assert.match(success('--help'), /new or empty directory/);
  assert.notEqual(run().status, 0);
  const generated = path.join(temp, 'my app');
  success(generated);
  const manifest = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/template-manifest.json'], { encoding: 'utf8' }));
  const packageManifest = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }));
  assert.equal(packageManifest.private, undefined);
  assert.equal(packageManifest.version, pkg.version);
  const bundledPaths = manifest.files.map(file => file.path);
  assert.deepEqual(bundledPaths.filter(file => file.startsWith('.github/workflows/')).sort(), ['.github/workflows/ci.yml', '.github/workflows/docker.yml']);
  assert.ok(!bundledPaths.some(file => file.startsWith('scripts/npm/') || file === 'docs/npm-release.md'), 'Do not bundle upstream release tooling or maintainer-only documentation.');
  for (const file of manifest.files) {
    const bytes = await fs.readFile(path.join(generated, file.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    if (artifactIndex < 0 && !['package.json', '.github/workflows/ci.yml'].includes(file.path)) assert.deepEqual(bytes, await fs.readFile(path.join(root, file.path)), file.path);
    assert.equal((await fs.stat(path.join(generated, file.path))).mode & 0o777, file.mode, file.path);
    assert.ok(!file.path.split('/').some(part => /^(?:\.env(?:\.|$)|node_modules$|\.next$|\.vercel$|\.git$)/.test(part)), file.path);
  }
  for (const file of ['.gitignore', '.npmrc', '.github/workflows/ci.yml', 'README.zh-CN.md', 'README.ja.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'pnpm-lock.yaml', 'env.local.example']) {
    assert.ok(manifest.files.some(entry => entry.path === file), 'Missing ' + file);
  }
  const generatedPackage = JSON.parse(await fs.readFile(path.join(generated, 'package.json'), 'utf8'));
  assert.equal(generatedPackage.private, true);
  assert.ok(!Object.keys(generatedPackage.scripts).some(name => name.startsWith('npm:')));
  assert.equal(generatedPackage.scripts.verify, pkg.scripts.verify);
  const generatedCi = await fs.readFile(path.join(generated, '.github/workflows/ci.yml'), 'utf8');
  assert.match(generatedCi, /pnpm run verify/);
  assert.doesNotMatch(generatedCi, /pnpm run npm:/);
  if (artifactIndex < 0) {
    const { 'npm:build': _build, 'npm:test': _test, ...applicationScripts } = pkg.scripts;
    assert.deepEqual(generatedPackage, { ...pkg, scripts: applicationScripts });
    assert.equal(generatedCi, (await fs.readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')).replace('      - run: pnpm run npm:test\n', ''));
  }
  for (const file of ['scripts/npm', 'docs/npm-release.md', '.github/workflows/npm-release.yml', '.github/workflows/deploy.yml']) {
    await assert.rejects(fs.stat(path.join(generated, file)), { code: 'ENOENT' });
  }
  for (const document of ['README.md', 'README.zh-CN.md', 'README.ja.md', 'AGENTS.md', 'ARCHITECTURE.md', 'RECIPE.md', 'THIRD_PARTY_NOTICES.md']) {
    const text = await fs.readFile(path.join(generated, document), 'utf8');
    for (const [, target] of text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const destination = target.split('#')[0];
      await fs.stat(path.resolve(generated, path.dirname(document), destination));
    }
  }
  assert.match(run(generated).stderr, /new or empty/);
  assert.deepEqual(await fs.readFile(path.join(generated, 'README.md')), await fs.readFile(path.join(root, 'README.md')));
  await fs.mkdir(path.join(temp, 'empty'));
  success('empty');
  await fs.writeFile(path.join(temp, 'file'), 'preserve me');
  assert.notEqual(run('file').status, 0);
  assert.equal(await fs.readFile(path.join(temp, 'file'), 'utf8'), 'preserve me');
  await fs.mkdir(path.join(temp, 'real'));
  await fs.symlink(path.join(temp, 'real'), path.join(temp, 'link'));
  assert.match(run('link/child').stderr, /symlinks/);
  assert.deepEqual(await fs.readdir(path.join(temp, 'real')), []);
  const mismatch = spawnSync(process.execPath, ['scripts/npm/build.mjs', '--tag', 'v999.0.0'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /Tag must exactly match/);
  console.log('Scaffold tarball passed offline CLI, file hash, dotfile and destination checks.');
  if (args.includes('--application')) {
    await fs.writeFile(path.join(generated, '.env.local'), 'NEXT_PUBLIC_AGORA_APP_ID=0123456789abcdef0123456789abcdef\nNEXT_AGORA_APP_CERTIFICATE=fedcba9876543210fedcba9876543210\n', { flag: 'wx' });
    execFileSync('pnpm', ['install', '--frozen-lockfile', '--store-dir', path.join(temp, 'pnpm-store')], { cwd: generated, stdio: 'inherit' });
    execFileSync('pnpm', ['run', 'verify'], { cwd: generated, stdio: 'inherit' });
    console.log('Generated application passed full verification with synthetic credentials.');
  }
  passed = true;
} finally {
  if (passed) await fs.rm(temp, { recursive: true, force: true });
  else console.error('Failure evidence retained at ' + temp);
}
