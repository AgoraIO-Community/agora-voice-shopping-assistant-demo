#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));

try {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log(`Usage: npx ${pkg.name}@${pkg.version} <directory>\nCreate a complete editable demo in a new or empty directory. Requires Node.js 24.`);
  } else if (args.length === 1 && ['--version', '-v'].includes(args[0])) {
    console.log(pkg.version);
  } else {
    if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node.js 24.');
    if (args.length !== 1 || !args[0] || args[0].startsWith('-')) throw new Error(`Usage: npx ${pkg.name} <directory>`);
    const target = path.resolve(args[0]);
    // Check every existing ancestor so a symlink cannot redirect writes.
    let current = path.parse(target).root;
    for (const part of target.slice(current.length).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      const info = await fs.lstat(current).catch(error => { if (error.code !== 'ENOENT') throw error; });
      if (info && (!info.isDirectory() || info.isSymbolicLink())) throw new Error('Destination must use real directories, without symlinks.');
    }
    const contents = await fs.readdir(target).catch(error => { if (error.code !== 'ENOENT') throw error; return []; });
    if (contents.length) throw new Error('Destination must be new or empty.');
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'template-manifest.json'), 'utf8'));
    // Validate every bundled file before creating the destination.
    const files = [];
    for (const file of manifest.files) {
      for (const relative of [file.path, file.stored]) {
        if (typeof relative !== 'string' || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..') || path.isAbsolute(relative)) {
          throw new Error('Invalid bundled template path.');
        }
      }
      const bytes = await fs.readFile(path.join(root, 'template', file.stored));
      if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Bundled template checksum mismatch: ' + file.path);
      files.push({ ...file, bytes });
    }
    await fs.mkdir(target, { recursive: true });
    for (const file of files) {
      const destination = path.join(target, file.path);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, file.bytes, { flag: 'wx', mode: file.mode });
    }
    console.log(`Created ${target}\n\nNext:\n  cd ${JSON.stringify(args[0])}\n  cp env.local.example .env.local\n  # Add your Agora credentials to .env.local.\n  pnpm install --frozen-lockfile\n  pnpm dev`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
