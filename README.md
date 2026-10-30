# Pixelfed sample plugin

This sample implements Pixelfed through Flare's Social Plugin API v1. It is a
self-contained classic script and has no npm or runtime dependencies.

Implemented features:

- exact Pixelfed detection;
- dynamic OAuth client registration and login;
- Home, Discover, Local, Federated, Bookmarks, and Favourites timelines;
- profile lookup, Posts/Gallery tabs, following/followers, and search;
- post detail, context, delete, favourite, repost, and bookmark actions;
- media upload and status publishing.

Guest mode, lists, direct messages, notifications, and plugin Deep Links are
intentionally omitted. The manifest exposes only the implemented capabilities
and configuration. Custom plugin UI is unavailable in API v1.

The manifest explicitly requests `mediaNetwork` so avatars and federated/CDN
images can load. Installation review discloses that media destinations may
receive this plugin's account data.

## Compatibility

Version **0.2.0** targets the `UiTimelineV2` protocol in
[Flare PR #2399 at `f901b611e`](https://github.com/DimensionDev/Flare/commit/f901b611e91b0f7d9105aa05d89d08016fa7988b).
Use a Flare build containing that change; older plugin hosts are incompatible.

The plugin registers with `defineFlareSocialPlugin`. Timeline, search, profile
timeline, and thread pages return `TimelineItemV1` entries. Reblogs use
`presentation.repost`, and post detail returns `{ post, presentation }` without
a `type` discriminator. Publishing and post mutations still return `PostV1`
entities, preserving reply, favourite, repost, bookmark, and delete controls.

Plugin/platform IDs, permissions, credentials, and timeline IDs are unchanged.
There is no old-protocol compatibility layer or credential migration.

## Develop locally in Desktop

In Settings > Plugins > Plugin development, select this directory and start
development. File edits are validated automatically; use **Reload plugin** to
apply them. See [local development](https://github.com/DimensionDev/Flare/blob/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/references/testing.md#develop-locally-in-desktop)
for account access, reload boundaries, and restoring the installed version.

## Install from GitHub

Use a Flare build matching the compatibility requirement above.

1. Open **Settings > Plugins > + > Install from GitHub**.
2. Enter **https://github.com/Tlaster/flare-plugin-pixelfed**.
3. Click **Install** to download the latest stable tag, currently **v0.2.0**.
4. Review the plugin and its media permission, then confirm installation.
5. Choose Pixelfed when adding an account and authorize your
   Pixelfed instance in the browser.

Installation takes effect immediately. For an existing installation, update
Flare first, then use **Check for updates** in plugin management, review
**v0.2.0**, and confirm the update. Existing accounts and saved tabs are retained.

The stable tag matches `manifest.version`. The script is already built; a
GitHub Release or uploaded `.fpp` asset is unnecessary.

For a separately maintained fork, choose your own plugin ID and a distinct
platform ID before release. The sample's `Pixelfed` platform ID cannot coexist
with another registered platform of the same name. Keep IDs stable after users
install the fork. See [GitHub publication and updates](https://github.com/DimensionDev/Flare/blob/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/references/publishing.md).

This example cannot be installed by passing the Flare monorepo URL or a GitHub
subdirectory URL: each installation repository must contain one root plugin.
Actual server behavior may differ by Pixelfed version; report the instance and
checks performed when claiming live compatibility.

## Optional local package

Use the [Flare SDK packer](https://github.com/DimensionDev/Flare/blob/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/pack.mjs) with a staging directory containing
only `manifest.json`, `plugin.js`, `assets/`, and `locales/`; keep `.git`, this
repository's license, and build outputs outside the staging directory.
See [local packaging](https://github.com/DimensionDev/Flare/blob/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/references/publishing.md#optional-local-installation).
The GitHub installation flow above does not require local packaging.

The bundled icon comes from Pixelfed's official
[`brand-assets`](https://github.com/pixelfed/brand-assets) repository.

## Read the implementation

- `manifest.json`: static capabilities, timeline/profile tabs, compose defaults,
  localized labels, and explicit media permission.
- `plugin.js`: detection, OAuth registration/resume, structured HTTP, entity
  mapping, cursor pagination, actions, and multipart publication.
- `locales/`: English and Simplified Chinese catalogs. The SDK guides are English;
  these catalogs demonstrate plugin localization.

Use the [capability recipes](https://github.com/DimensionDev/Flare/blob/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/references/recipes.md) for features this sample
does not implement and [testing](https://github.com/DimensionDev/Flare/blob/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/references/testing.md) for evidence levels.

## Regression tests

With Node.js 22 or newer, no package installation is required:

```sh
node --check plugin.js
node --test tests/*.test.mjs
```

The tests execute the actual script with fixture HTTP responses. They cover
registration, every timeline-producing entry point, repost identity and actions,
detail/thread shapes, pagination, all six post mutations, media publication,
profile search, and malformed responses. GitHub Actions runs these checks on
pushes and pull requests. These tests do not contact a Pixelfed server.

For Host validation, run Flare's `PixelfedSampleTest` using this checkout's
runtime files in its sample staging directory. That exercises the real package
importer, strict Wire decoding, QuickJS, OAuth fixtures, and capability adapters.
Node fixtures alone do not establish native-engine or platform UI compatibility.

## Optional real-instance smoke test

Set `PIXELFED_TEST_HOST` and `PIXELFED_TEST_TOKEN` when running the JVM tests.
The test remains read-only unless `PIXELFED_TEST_ALLOW_WRITE=1` is also set.

## Source and license

The runtime script matches the
[Flare Pixelfed sample at `f901b611e`](https://github.com/DimensionDev/Flare/tree/f901b611e91b0f7d9105aa05d89d08016fa7988b/feature/plugin/sdk/skill/flare-plugin/examples/pixelfed).
This repository uses its own release version, documentation, and regression tests.
This repository is for manual GitHub-installation testing. The Flare source
license is included in [LICENSE](LICENSE); the icon's upstream attribution is
retained above. Live OAuth and server behavior must be checked against the
Pixelfed instance you use.
