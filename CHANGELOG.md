# Changelog

All notable changes to the `golden-frijoles` plugin (and, from S2, the `@golden-frijoles/kit` package)
are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses [Semantic Versioning](https://semver.org/). `plugin.json`'s `version` and this file's
newest heading are always the same number — `scripts/check-release.mjs` enforces it in CI.

## [Unreleased]

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
