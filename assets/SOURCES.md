# Brand assets — not covered by the MIT license

This directory holds artwork for the two presets the plugin ships. **These files
belong to their owners, are not covered by this repository's MIT license, and
are here only so that a preset can put a recognizable mark in front of the tool
it represents.** All of them are published by the vendor itself; nothing here was
redrawn.

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

- Source: the `openai/codex` repository, commit
  [`6832f365`](https://github.com/openai/codex/commit/6832f3657a1dada0aec99fb33d17caca66d5da23),
  file `codex-rs/login/src/assets/success.html` — the inline mark used as that
  page's logo and favicon. OpenAI publishes no standalone Codex logo file (the
  repository has none, and `openai.com/brand` does not offer one), so this
  vendor-authored artwork is the closest official asset.
- `codex-mark.svg` is that markup verbatim (black `#000` stroke).
  `codex-mark-light.svg` is the same path with a white stroke, for dark
  backgrounds — the only change.

## What the plugin embeds

`client.js` embeds base64 copies of three files so a preset works offline with a
single click:

| Preset | Embedded | Extra fields |
| --- | --- | --- |
| Claude Code | `claude-spark-clay.svg`, `claude-code-logo-slate.svg` | badge `ANTHROP\C`, mark cell hidden |
| Codex | `codex-mark.svg` | name `Codex`, badge `OPENAI` |

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
