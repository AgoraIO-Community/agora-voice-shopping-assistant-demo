import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.ok(!fs.existsSync(path.join(root, 'docs', 'scenario')), 'Keep scenario guidance in root documents and internal acceptance material outside the repository.');
const documents = ['README.md', 'AGENTS.md', 'ARCHITECTURE.md', 'RECIPE.md', 'THIRD_PARTY_NOTICES.md'];

for (const file of [...documents, 'CLAUDE.md', 'LICENSE', 'env.local.example', 'app/page.tsx', 'app/layout.tsx']) {
  assert.ok(fs.existsSync(path.join(root, file)), 'Missing ' + file);
}
assert.equal(read('CLAUDE.md'), 'This project uses AGENTS.md instead of a CLAUDE.md file.\n\nPlease see @AGENTS.md in this same directory and treat its content as the primary reference for this project.');
assert.equal(pkg.packageManager, 'pnpm@9.15.9');
assert.match(read('pnpm-lock.yaml'), /^lockfileVersion: '9\.0'/);
assert.match(read('.github/workflows/ci.yml'), /pnpm run verify/);

for (const file of documents) {
  for (const [, target] of read(file).matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const destination = target.split('#')[0];
    assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), destination)), file + ': broken link ' + target);
  }
}
for (const file of ['README.md', 'AGENTS.md']) {
  assert.ok(read(file).includes('env.local.example') && read(file).includes('.env.local'), file + ': setup guidance missing');
}
for (const command of Object.keys(pkg.scripts).filter(key => key.startsWith('verify:') && key !== 'verify:docker')) {
  assert.ok(pkg.scripts.verify.includes('pnpm run ' + command), 'Canonical verify omits ' + command);
}
if (pkg.scripts['verify:docker']) {
  assert.match(read('Dockerfile'), /pnpm@9\.15\.9/);
  assert.match(read('Dockerfile'), /ARG NEXT_PUBLIC_AGORA_APP_ID/);
  assert.match(read('Dockerfile'), /USER nextjs/);
  assert.match(read('.dockerignore'), /\*\*\/\.env\*/);
  assert.match(read('.github/workflows/docker.yml'), /pnpm run verify:docker/);
}
console.log('Demo repository checks passed: ' + pkg.name);
