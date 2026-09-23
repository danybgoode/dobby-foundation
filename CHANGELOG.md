# Changelog

All notable changes to the `golden-frijoles` plugin (and, from S2, the `@golden-frijoles/kit` package)
are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses [Semantic Versioning](https://semver.org/). `plugin.json`'s `version` and this file's
newest heading are always the same number — `scripts/check-release.mjs` enforces it in CI.

## [Unreleased]

## [0.2.0] - 2026-09-23

### Added

- `@golden-frijoles/kit` on npm: the 46 files the skills run, built from the skills' own `requires_scripts:`
  closure (never a committed copy), published from CI with provenance on the merge that bumps the version.
  `npx -y @golden-frijoles/kit@0.2.0 --list` shows what it carries.
- `gf-kit <name>` runs one script against the project you're standing in, found by walking up to `Roadmap/` or
  `.git` (override with `--root`). Nothing is copied into your repo.
- Skills run the kit unless the project has its own `scripts/<name>.mjs`, so a deliberate fork keeps working.

### Changed

- Every kit script resolves paths through one module (`lib/project-root.mjs`). A project's own copy behaves
  exactly as before.

## [0.1.0] - 2026-09-23

### Added

- The plugin ships under its product name: marketplace `golden-frijoles`, plugin `golden-frijoles`,
  installed with `claude plugin install golden-frijoles@golden-frijoles`.
- Apache-2.0 license and NOTICE at the repo root, so a stranger who installs the plugin is licensed to
  use it.
- Tagged releases: `plugin.json`'s `version` is the release, `scripts/check-release.mjs` fails a PR that
  changes a shipped file without bumping it, and `.github/workflows/release.yml` tags + publishes a
  GitHub Release from this file's newest section the moment a version bump merges to `main`.

### Changed

- Renamed from `ways-of-work@dobby-foundation`. `ways-of-work@dobby-foundation` no longer resolves —
  there is no alias (D6). Pin a release with `claude plugin marketplace add golden-frijoles/skills@v0.1.0`.
