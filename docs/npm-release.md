# npm scaffold releases and Vercel automation

This repository contains both a private Next.js application and the tools for publishing a public project creator. The application package stays private. `pnpm run npm:build` creates a separate npm package in `dist/`; it never publishes. No surrounding workspace or shared generator is required.

## Local checks

Use Node.js 24 and pnpm 9.15.9:

```bash
pnpm run npm:test
node scripts/npm/test.mjs --application
```

The first command builds a tarball and executes its installed CLI through offline npm exec. It checks file hashes, dotfiles, licenses, executable permissions, new/empty destinations and refusal of occupied directories and symlinks. The second also installs dependencies and runs the generated application's complete verification with synthetic credentials. It does not contact live Agora or Shopify services for acceptance testing.

Only allowlisted source files are included. The application template contains runtime source, assets, application configuration, environment examples, user/contributor documents, licenses and the explicitly selected general CI and Docker workflows. It excludes `scripts/npm/`, `.github/workflows/npm-release.yml`, `.github/workflows/deploy.yml` and this maintainer-only document. Other workflows are excluded unless explicitly allowlisted. The creator itself remains in the outer package's `bin/`; generated applications do not contain a second creator or publication toolchain.

The generated `package.json` omits `npm:build` and `npm:test`, and its CI omits the upstream scaffold test step. Other application scripts and application verification remain unchanged. Maintainer links in generated documentation point to the upstream GitHub document. Tests verify the excluded files and scripts, retained workflows, generated-document links and checksums of the final template bytes.

Real environment files, dependencies, caches and local evidence are excluded. Dot-prefixed template paths are encoded during packaging and restored on creation. The package includes source revision metadata and file checksums. A local build includes changes to tracked source files and is marked dirty when the checkout has changes; newly untracked files are not included. Release builds require a clean checkout.

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

A relevant main update deploys the website independently of npm publication. A failed npm publish does not roll back Vercel.

## Production website deployment with GitHub Actions

`.github/workflows/deploy.yml` maintains the existing `agora-voice-shopping-assistant-demo` project in the `agora-gdxe` team. The production URL remains https://agora-voice-shopping-assistant-demo.vercel.app. Keep Vercel native Git deployment disconnected: it would bypass this workflow's file filters and verification gate. This workflow does not create PR previews or deploy forks and generated repositories.

Configure these repository Actions settings:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `VERCEL_TOKEN` | A token permitted to pull production settings and deploy this project |
| Variable | `VERCEL_ORG_ID` | `team_1NUfVK0FWLLLqcZADKEwMHDt` |
| Variable | `VERCEL_PROJECT_ID` | `prj_HF0WW45Hz99swH424ah8KBgZJyQG` |

Keep Agora credentials and optional Shopify credentials in Vercel's production environment. Do not copy them into the workflow or repository. `NEXT_PUBLIC_AGORA_APP_ID` is public and available at build time; the App Certificate remains server-only. The verification job uses synthetic credentials on its own runner; production is built on a separate runner from Vercel's production environment.

### Automatic and manual triggers

Only pushes to Community `main` with a matching changed path trigger deployment:

- Runtime and static assets: `app/`, `components/`, `lib/`, `types/`, `styles/`, `public/`.
- Verification and build scripts: `scripts/`.
- Dependencies and runtime: `package.json`, `pnpm-lock.yaml`, `.npmrc`, `.nvmrc`.
- Build and verification configuration: `next.config.*`, `next-env.d.ts`, `tsconfig.json`, `postcss.config.*`, `tailwind.config.*`, `eslint.config.*`, `vercel.json`, `.vercelignore`.
- Deployment and reusable verification workflows: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`.

README, `docs/`, license and other documentation-only updates do not trigger this workflow. A mixed README/source update does. Assets must live in `public/` to count as deployable assets; `docs/recipe-cover.webp` is a repository illustration. New runtime directories or configuration filenames require updating the path list. GitHub evaluates at most 300 changed files for path filters; a change outside that evaluated list may be missed. Use the manual trigger if necessary. GitHub may run a workflow without path filtering for pushes exceeding 1,000 commits or diff timeouts.

To deploy explicitly (including after changing production environment variables), open **Actions → Deploy production website → Run workflow** and select **main**. Other branches and repositories are skipped by the job guard. Manual runs require the same verification as automatic runs and are remote writes that require authorization. The existing standalone CI workflow still runs independently; the deployment workflow calls CI again to gate its exact revision without granting the verifier production secrets.

### Build, acceptance and recovery

The workflow calls the existing CI workflow, including `pnpm run verify` and `pnpm run npm:test`. Deployment waits for successful verification, then uses Node.js 24, pnpm 9.15.9 and Vercel CLI 58.4.4 to pull production settings, build and deploy prebuilt output. Production runs are serialized and an active run is not canceled by a newer push. A newer queued run can replace an older pending run under GitHub's concurrency rules; runs are not a guaranteed FIFO queue.

Missing configuration, verification failures and Vercel errors fail the workflow. Verification/build failures occur before publication and leave the existing production deployment in place. Once Vercel publishes successfully, the public production page must pass an HTTP check; the run summary records the source revision and deployment URL. HTTP success does not establish working voice, microphone, live Shopify queries or version equality at the public alias. Those need separate online acceptance.

A failed post-publication check does not roll back automatically. Inspect the Actions/Vercel logs, then explicitly authorize a rollback to a known-good deployment in Vercel or revert the faulty source and deploy again. A workflow rerun can deploy its original revision, so inspect that revision before rerunning an older deployment.

Local workflow validation does not establish live token permissions, successful production builds or end-to-end voice behavior. First deployment and a subsequent source update must be observed online before calling automatic deployment verified.
