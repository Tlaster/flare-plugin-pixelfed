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

## Develop locally in Desktop

In Settings > Plugins > Plugin development, select this directory and start
development. File edits are validated automatically; use **Reload plugin** to
apply them. See [local development](https://github.com/DimensionDev/Flare/blob/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/references/testing.md#develop-locally-in-desktop)
for account access, reload boundaries, and restoring the installed version.

## Install from GitHub

Use a Flare build that includes social plugins (currently developed in
[PR #2399](https://github.com/DimensionDev/Flare/pull/2399)).

1. Open **Settings > Plugins > + > Install from GitHub**.
2. Enter **https://github.com/Tlaster/flare-plugin-pixelfed**.
3. Load versions and select **v0.1.0**.
4. Review the plugin and its media permission, then confirm installation.
5. Restart Flare, choose Pixelfed when adding an account, and authorize your
   Pixelfed instance in the browser.

The stable tag matches `manifest.version`. The script is already built; a
GitHub Release or uploaded `.fpp` asset is unnecessary.

For a separately maintained fork, choose your own plugin ID and a distinct
platform ID before release. The sample's `Pixelfed` platform ID cannot coexist
with another registered platform of the same name. Keep IDs stable after users
install the fork. See [GitHub publication and updates](https://github.com/DimensionDev/Flare/blob/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/references/publishing.md).

This example cannot be installed by passing the Flare monorepo URL or a GitHub
subdirectory URL: each installation repository must contain one root plugin.
Actual server behavior may differ by Pixelfed version; report the instance and
checks performed when claiming live compatibility.

## Optional local package

Use the [Flare SDK packer](https://github.com/DimensionDev/Flare/blob/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/pack.mjs) with a staging directory containing
only `manifest.json`, `plugin.js`, `assets/`, and `locales/`; keep `.git`, this
repository's license, and build outputs outside the staging directory.
See [local packaging](https://github.com/DimensionDev/Flare/blob/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/references/publishing.md#optional-local-installation).
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

Use the [capability recipes](https://github.com/DimensionDev/Flare/blob/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/references/recipes.md) for features this sample
does not implement and [testing](https://github.com/DimensionDev/Flare/blob/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/references/testing.md) for evidence levels.

## Optional real-instance smoke test

Set `PIXELFED_TEST_HOST` and `PIXELFED_TEST_TOKEN` when running the JVM tests.
The test remains read-only unless `PIXELFED_TEST_ALLOW_WRITE=1` is also set.

## Source and license

The plugin files are copied unchanged from the
[Flare Pixelfed sample at `c5fc15f0c`](https://github.com/DimensionDev/Flare/tree/c5fc15f0cd13ac0d451ba27340a4acaef89461b8/feature/plugin/sdk/skill/flare-plugin/examples/pixelfed).
This repository is for manual GitHub-installation testing. The Flare source
license is included in [LICENSE](LICENSE); the icon's upstream attribution is
retained above. Live OAuth and server behavior must be checked against the
Pixelfed instance you use.
