import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
const rootFiles = new Set(['package.json', 'pnpm-lock.yaml', 'env.local.example', 'README.md', 'README.zh-CN.md', 'README.ja.md', 'AGENTS.md', 'CLAUDE.md', 'ARCHITECTURE.md', 'RECIPE.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'Dockerfile', '.dockerignore', '.gitignore', '.gitattributes', '.npmrc', '.nvmrc', '.vercelignore', 'components.json', 'eslint.config.mjs', 'next.config.mjs', 'postcss.config.mjs', 'tsconfig.json', 'vercel.json']);
const roots = new Set(['app', 'components', 'lib', 'types', 'styles', 'public', 'scripts']);
const ownedFiles = ['scripts/npm/create.mjs', 'scripts/npm/build.mjs', 'scripts/npm/test.mjs', '.github/workflows/npm-release.yml', 'docs/npm-release.md'];

try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Build with Node.js 24.');
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--tag')) throw new Error('Usage: node scripts/npm/build.mjs [--tag vX.Y.Z]');
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('Use a stable X.Y.Z package version.');
  const sourceCommit = git('rev-parse', 'HEAD');
  const sourceDirty = Boolean(git('status', '--porcelain'));
  if (args.length) {
    if (args[1] !== `v${pkg.version}`) throw new Error('Tag must exactly match the package version.');
    if (sourceDirty) throw new Error('Release requires a clean checkout.');
    if (git('rev-parse', `${args[1]}^{commit}`) !== sourceCommit) throw new Error('Tag must point to the checked-out commit.');
    git('merge-base', '--is-ancestor', sourceCommit, 'origin/main');
  }
  const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
  const selected = [...new Set([...tracked, ...ownedFiles])].filter(file => {
    const parts = file.split('/');
    return (rootFiles.has(file) || roots.has(parts[0]) || file.startsWith('.github/workflows/') || file === 'docs/recipe-cover.webp' || file === 'docs/npm-release.md') &&
      !parts.some(part => /^(?:\.env(?:\.|$)|node_modules$|\.git$|\.next(?:-|$)|\.vercel$|\.pnpm-store$|\.scenario-data$|evidence$|coverage$|__screenshots__$)/i.test(part)) &&
      !/\.(?:log|tgz|tsbuildinfo|woff2?|ttf|otf)$/i.test(file);
  }).sort();
  const output = path.join(root, 'dist');
  await fs.mkdir(output, { recursive: true });
  const staging = await fs.mkdtemp(path.join(output, '.scaffold-'));
  try {
    const manifest = { sourceRepository: pkg.repository.url, sourceCommit, sourceDirty, files: [] };
    for (const file of selected) {
      let current = root;
      for (const part of file.split('/')) {
        current = path.join(current, part);
        if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Template symlinks are not supported: ' + file);
      }
      const info = await fs.stat(current);
      if (!info.isFile()) throw new Error('Template entry is not a file: ' + file);
      const bytes = await fs.readFile(current);
      if (file === 'env.local.example' && bytes.toString().split(/\r?\n/).some(line => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S/.test(line))) throw new Error('Environment example must have blank values.');
      const stored = file.split('/').map(part => {
        if (part.startsWith('__dot__')) throw new Error('Reserved template filename: ' + file);
        return part.startsWith('.') ? '__dot__' + part.slice(1) : part;
      }).join('/');
      const destination = path.join(staging, 'template', stored);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, bytes);
      manifest.files.push({ path: file, stored, sha256: createHash('sha256').update(bytes).digest('hex'), mode: info.mode & 0o111 ? 0o755 : 0o644 });
    }
    await fs.mkdir(path.join(staging, 'bin'));
    await fs.copyFile(path.join(root, 'scripts/npm/create.mjs'), path.join(staging, 'bin/create.mjs'));
    await fs.chmod(path.join(staging, 'bin/create.mjs'), 0o755);
    await fs.copyFile(path.join(root, 'LICENSE'), path.join(staging, 'LICENSE'));
    await fs.writeFile(path.join(staging, 'template-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await fs.writeFile(path.join(staging, 'package.json'), JSON.stringify({
      name: pkg.name, version: pkg.version, description: 'Create a complete editable Agora voice shopping demo.',
      type: 'module', license: 'MIT', engines: { node: '24.x' },
      bin: { [pkg.name]: 'bin/create.mjs' }, files: ['bin/', 'template/', 'template-manifest.json', 'README.md', 'LICENSE'],
      repository: pkg.repository, homepage: pkg.homepage, bugs: pkg.bugs,
      publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' },
    }, null, 2) + '\n');
    await fs.writeFile(path.join(staging, 'README.md'), `# ${pkg.name}\n\nCreate a complete editable Next.js voice shopping demo. Requires Node.js 24 and pnpm 9.15.9.\n\n\`\`\`bash\nnpx ${pkg.name}@${pkg.version} my-app\ncd my-app\ncp env.local.example .env.local\n# Fill in your own Agora credentials.\npnpm install --frozen-lockfile\npnpm dev\n\`\`\`\n\nThe destination must be new or empty. Creation does not install dependencies, initialize Git or configure credentials. The template is bundled; generation makes no network requests. This is a project generator, not an SDK.\n\nRead the generated README for capabilities, third-party notices and read-only Shopify limits. Keep server credentials private.\n\nSource: ${pkg.homepage.replace(/#readme$/, '')}/tree/${sourceCommit}\n\n${sourceDirty ? 'Local preview includes uncommitted source; not a release snapshot.' : 'Built from a clean source checkout.'} File hashes are recorded in template-manifest.json.\n`);
    const result = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--cache', path.join(output, '.npm-cache'), '--pack-destination', output], { cwd: staging, encoding: 'utf8' }));
    console.log(path.join(output, result[0].filename));
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
