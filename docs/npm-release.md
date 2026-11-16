# npm scaffold releases and Vercel automation

This repository contains both a private Next.js application and the tools for publishing a public project creator. The application package stays private. `pnpm run npm:build` creates a separate npm package in `dist/`; it never publishes. No surrounding workspace or shared generator is required.

## Local checks

Use Node.js 24 and pnpm 9.15.9:

```bash
pnpm run npm:test
node scripts/npm/test.mjs --application
```

The first command builds a tarball and executes its installed CLI through offline npm exec. It checks file hashes, dotfiles, licenses, executable permissions, new/empty destinations and refusal of occupied directories and symlinks. The second also installs dependencies and runs the generated application's complete verification with synthetic credentials. It does not contact live Agora or Shopify services for acceptance testing.

Only allowlisted source files are included. Real environment files, dependencies, caches and local evidence are excluded. Dot-prefixed template paths are encoded during packaging and restored on creation. The package includes source revision metadata and file checksums. A local build may include uncommitted changes and is marked as such; release builds require a clean checkout.

## One-time npm setup

An npm package owner must configure a Trusted Publisher for `agora-voice-shopping-assistant-demo` on npm:

- Provider: GitHub Actions.
- Organization: `AgoraIO-Community`.
- Repository: `agora-voice-shopping-assistant-demo`.
- Workflow filename: `npm-release.yml`.
- Environment: leave blank; this workflow does not select an environment.

The workflow uses a GitHub-hosted Linux runner, Node.js 24, npm 11 and OIDC (`id-token: write`). It does not require an npm token in GitHub secrets. Package ownership, existing versions and Trusted Publisher configuration must be checked separately; local builds do not establish those permissions. New package names may need a separately authorized initial publication before an owner can configure trust.

The workspace's previous publication record identifies Shopping 0.1.0 as published. The next source version is 0.1.1; the registry has not been rechecked by this implementation.

## Release contract

1. Set `package.json` to a new stable X.Y.Z version. Keep the application private.
2. Review and merge the intended source into Community main.
3. Create and push a matching `vX.Y.Z` tag at that commit, only after obtaining authorization for those Git operations.
4. The workflow requires an exact version match, a clean checkout and a commit reachable from Community main.
5. It builds one tarball, tests the installed creator and runs the generated application's full verification.
6. A separate job downloads that artifact and publishes those exact bytes to npm with provenance.

The canonical repository guard prevents personal mirrors and generated forks from publishing this package. Existing versions are immutable; a duplicate version fails. If publishing fails after verification, rerun only the publish job to consume the same retained artifact (7 days). If the artifact is gone or source changes, prepare a new version rather than rebuilding an approved artifact invisibly. A workflow rerun is a remote write and needs separate authorization.

A main commit deploys the website independently of npm publication. A failed npm publish does not roll back Vercel.

## Vercel Git integration

An authorized Vercel administrator must connect the existing Shopping project in the `agora-gdxe` team to the Community repository. Reuse the existing project so the production URL remains stable. Set the production branch to `main`, Node.js to 24, and use the existing vercel.json install/build settings. Preserve existing production variables. Configure preview credentials separately if PR previews need to start voice sessions; never expose the App Certificate through NEXT_PUBLIC variables.

With native Git integration, main pushes trigger production deployments and PRs can trigger preview deployments. Check Vercel GitHub App access and fork-preview policy. Native integration builds independently of GitHub CI; it does not guarantee that every CI check finishes before production deployment. If strict CI gating becomes a requirement, change the deployment design explicitly.

No Vercel Git connection, npm trust setting, credential change, Git write or npm publication is performed by the local implementation.
