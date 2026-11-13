# Brand assets — not covered by the MIT license

This directory holds artwork for the two presets the plugin ships. **These files
belong to their owners, are not covered by this repository's MIT license, and
are here only so that a preset can put a recognizable mark in front of the tool
it represents.**

## Claude / Claude Code — Anthropic PBC

- Source: Anthropic's official press kit, <https://www.anthropic.com/press-kit>
  → `https://www-cdn.anthropic.com/ae59ca4ca194dac9c9dc3bc78c5829468cb0e8af.zip`
  (26,465,941 bytes, SHA-256 `C68AC92DF86C825F95177E24016FCC9A8863A3FD4CA344FE6F0700B2C1E07151`,
  downloaded 2026-11-13).
- Extracted unchanged (no recolor, no crop, no redraw); only the file names were
  shortened. Paths inside the archive:
  `Anthropic media resources/Anthropic logos/Claude logos/…`

| File | Archive path | Colors |
| --- | --- | --- |
| `claude-spark-clay.svg` | `3 Claude Spark/SVG/Claude Spark - Clay.svg` | clay `#D97757` |
| `claude-code-logo-slate.svg` | `2 Claude Code logo/SVG/Claude Code logo - Slate.svg` | clay spark + `#151514` lettering |
| `claude-code-logo-ivory.svg` | `2 Claude Code logo/SVG/Claude Code logo - Ivory.svg` | clay spark + `#FAF9F5` lettering |
| `claude-code-logo-onecolor.svg` | `2 Claude Code logo/SVG/Claude Code logo - One-color.svg` | all white `#fff` |
| `claude-icon-rounded.svg` | `4 Claude icon/SVG/ClaudeIcon-Rounded.svg` | clay tile + ivory spark |
| `claude-icon-square.svg` | `4 Claude icon/SVG/ClaudeIcon-Square.svg` | clay tile + ivory spark |

The press kit also contains PNG exports of every file above; only the vector
files are kept here.

## Codex — OpenAI

OpenAI publishes **no standalone Codex logo file**. Checked on 2026-11-13:

- `openai/codex` (the official repository) ships no logo asset — a full tree scan
  finds only `.github/codex-cli-splash.png`, a terminal screenshot. Its login
  page brands itself with the inline `>_`-in-a-circle SVG kept here as
  `codex-mark.svg`.
- `openai.com/brand` answers 403 to non-browser requests and offers no public
  download.
- The official Codex page (<https://chatgpt.com/codex>) brands itself with a
  **wordmark only** — white “Codex” on an indigo gradient, in its `og:image` —
  and its favicons are the ChatGPT blossom.
- The Codex **product icon** (blue cloud with a `>_` prompt) exists only inside
  OpenAI's own distributions: the macOS app bundle (`Codex.dmg`, 912 MB, linked
  from the app's Sparkle feed at
  `https://persistent.oaistatic.com/codex-app-prod/appcast.xml`) and the
  `openai.chatgpt` VS Code extension.

| File | What it is | Provenance |
| --- | --- | --- |
| `codex-app-icon.png` | the Codex product mark: blue cloud with a white `>_` prompt, 104 × 104, transparent RGBA | OpenAI's app mark, obtained from the GitHub mirror [`bytepioneer-ai/codex-host`](https://github.com/bytepioneer-ai/codex-host/blob/main/packages/renderer-extension/src/assets/README.md), whose README records extracting it from the `openai.chatgpt` VS Code extension distributed by OpenAI. Re-fetched from an OpenAI endpoint here was not possible (see above). SHA-256 `8E82B26C98A10E45798CE48124515720657F7735FB8D0853B3F087EAA8A6B74E`. **This one is the preset's mark.** |
| `codex-mark.svg` | the `>_`-in-a-circle mark from the Codex login page | verbatim copy of the SVG in [`openai/codex` `codex-rs/login/src/assets/success.html`](https://github.com/openai/codex/blob/main/codex-rs/login/src/assets/success.html), black stroke |
| `codex-mark-light.svg` | the same path, white stroke | recolored for dark backgrounds — the only change |

The preset therefore uses the app icon; the two `codex-mark*.svg` files are the
strictly repository-published alternative if you prefer a monochrome mark.

## What the plugin embeds

`client.js` embeds base64 copies of three files so a preset works offline with a
single click:

| Preset | Embedded | Extra fields |
| --- | --- | --- |
| Claude Code | `claude-spark-clay.svg`, `claude-code-logo-slate.svg` | badge `ANTHROP\C`, mark cell hidden |
| Codex | `codex-app-icon.png` | name `Codex` |

Regenerate the embedded copies after changing any of those files:

```sh
node tools/embed-presets.mjs
```

## Trademark rules

Both vendors allow naming their product, and both forbid what would suggest
endorsement:

- Anthropic: <https://www.anthropic.com/legal/trademark-guidelines> and
  <https://code.claude.com/docs/en/legal-and-compliance> — no alterations to
  color, font, or proportion; no use in your own product's name or logo; no
  implication that Anthropic built, endorses, or partners with your work.
- OpenAI: <https://openai.com/brand> — the OpenAI name, logo, and the ChatGPT and
  GPT marks belong to OpenAI; use is limited to approved references.

Personal, local use of these presets is exactly that: a local decoration. Do not
ship a fork whose branding suggests the plugin is an Anthropic or OpenAI product.
