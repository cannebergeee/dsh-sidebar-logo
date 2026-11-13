# Sidebar logo

English | [中文](README.zh.md)

A DeepSeek Harness plugin that replaces parts of the logo in the sidebar's
top-left corner — the DeepSeek whale, the `deepseek` wordmark, and the `HARNESS`
badge — with your own artwork, edited from a page inside Settings. Two built-in
presets switch the whole row to Claude Code or Codex in one click, and three
switches port Claude Code's colour tokens, composer card and conversation onto
the shipped interface (see “Claude interface” below).

## Install

This repository root is the plugin package.

```sh
# from a shell where the dsh CLI is available, targeting your profile
dsh plugin --profile <profile> add github:cannebergeee/dsh-sidebar-logo
```

Or, from inside DSH, install the bundle with the GitHub spec
`github:cannebergeee/dsh-sidebar-logo` (Plugin Manager, or the
`plugin_manager` tool with `action: install_bundle`), then enable it in
**Plugins**. **Plugins → Add plugin** also installs a local checkout of this
directory.

## Use it

1. Open **Settings** (sidebar foot) and choose **Sidebar logo** in the section list.
2. Press a preset, or fill in any combination of:
   - **Mark image** — a square image drawn at 24 × 24 px where the whale sits.
   - **Wordmark image** — a wide logo image after the mark.
   - **Hide the mark cell** — keep the mark cell empty instead of showing the
     shipped whale, for a wordmark image that already contains its own mark.
   - **Hide the logo row** — show no logo at all and pull the rest of the
     sidebar up (see below).
   - **Name** — plain text beside the mark.
   - **Badge** — a short tag after the name, like `HARNESS`.
3. The preview follows your edits, and so does the sidebar (about 200 ms after
   you stop typing, or immediately when you leave a field).

**A part you leave blank keeps the shipped DeepSeek artwork.** That is per part,
not all-or-nothing: set only the name and the whale stays; set only the mark and
the shipped wordmark stays. Turn on **Hide the mark cell** when the artwork you
supply replaces the whole lockup, so the whale does not sit beside it.

**Reset to shipped logo** clears every field and brings the original back.

## Presets

Two presets set every field at once. They live above the preview, and the button
of the configuration you are currently on stays highlighted.

| Preset | Applies | Artwork |
| --- | --- | --- |
| **Claude Code** | wordmark = the Claude Code lockup, badge `ANTHROP\C`, mark cell hidden (the spark is stored for when you unhide it) | [assets/claude-code-logo-slate.svg](assets/claude-code-logo-slate.svg), [assets/claude-spark-clay.svg](assets/claude-spark-clay.svg) |
| **Codex** | mark = the Codex app mark, name `Codex`, badge `OPENAI` | [assets/codex-app-icon.png](assets/codex-app-icon.png) |
| **No logo** | nothing at all — both cells empty and the row trimmed to the panel toggle | — |

OpenAI publishes no standalone Codex logo file: their own Codex page uses a
wordmark-only `og:image`, and the product icon exists only inside their app and
VS Code extension bundles. [assets/SOURCES.md](assets/SOURCES.md) records exactly
where each file came from, including the alternatives that ship here too
(`codex-mark.svg`, the `>_`-in-a-circle mark from the official repository).

A preset writes only the same five fields you can edit by hand, so after applying
one you can change or clear anything. The artwork is embedded in `client.js`
(13 KiB of base64) so a preset works with no file picking and no network;
`assets/` keeps the readable copies, and `node tools/embed-presets.mjs`
regenerates the embedded block after you change one.

## How it works

The plugin occupies the two cells the sidebar shell leaves open for brand
artwork, `sidebar.brand.mark` and `sidebar.brand.name`. Those are single slots,
so it registers at priority `-10` — a single slot allows one entry per priority
and the lowest priority renders, which shadows the shipped occupant registered
at `0` without uninstalling anything.

Occupancy is per cell and conditional: the mark cell is taken only while a mark
image is set or **Hide the mark cell** is on (it then paints nothing), the name
cell only while a wordmark image, name, or badge is set. With every field empty
and the switch off, the plugin registers nothing at all, so an untouched install
renders exactly the shipped logo.

Both cells also serve the collapsed 56 px rail, whose expand button rests on the
mark cell — which is why leaving the mark blank keeps the whale there instead of
leaving the button empty.

### How "No logo" reclaims the row

Empty cells alone are not enough: the shell still reserves a 60 px brand row. In
that mode the occupants render an invisible `[data-dsh-logo-hidden]` marker plus
one rule keyed on it, and the rule finds the row by **how deep the marker sits**
rather than by any of the shell's hashed class names — the row is removed, so the
New Session button and the workspace list start at the very top.

That removes the panel toggle too, since it lives in the same row. Collapsing the
sidebar from the keyboard still works: **Mod+B** (`Ctrl+B`, or `Cmd+B` on macOS;
rebindable in the shortcut reference). The collapsed rail keeps its own expand
button, because the rule is emitted by the name cell — the shell renders that
cell only while the sidebar is expanded.

If a future shell changes that nesting, the rule matches nothing and the row
simply stays where it is; the mode never hides an unrelated element.

## Claude interface

Three independent switches on the same Settings page port three parts of the
Claude Code look onto the shipped interface — taken from
[dsh-claude-style](https://github.com/Nwflower/dsh-claude-style) 0.21.0. Each one
takes effect the moment it is flipped; no reload.

| Switch | What it paints |
| --- | --- |
| **Colour tokens** | The clay accent `#d97757`, paper canvas `#ffffff`, warm sidebar `#fafafa` and the three border steps, with a dark set derived from the same seeds (`#191919` / `#1f1f1f`). The host reads them through its own `--dsw-alias-*` / `--dsw-specific-*` tokens, so one block repaints the canvas, the sidebar, every border, links, inline code and the user's bubble. |
| **Composer card** | An 18 px radius, 1 px outline, a soft lift, and a focus halo on the input card. The hero field keeps its 86 px; in a conversation the field grows with the draft. |
| **Conversation** | Prose rhythm and markdown material: 12 px paragraph spacing, the 24/12 heading rhythm, 12 px rounded code blocks, inline-code chips, table heads, quotes, `hr` and links. |

How it is wired: all three blocks live in one `<style>` element, each gated on
`body[data-dsh-logo-tokens]`, `[data-dsh-logo-composer]` or `[data-dsh-logo-chat]`
— with a switch off, its block matches nothing at all; nothing is overridden or
hidden. The selectors use only the semantic hooks the client already publishes
(`[data-composer-card]`, `[data-composer-input]`, `[data-phase]`,
`[data-chat-flow]`, `.md-code-block`), never hashed class names, so a host rebuild
can make a rule miss but cannot point it at the wrong element.

**The three Anthropic typefaces are not bundled** (they are not redistributable),
so this port carries the palette and the geometry and leaves the host's faces in
place.

⚠️ Do not run these together with a full theme plugin such as `dsh-claude-style`:
both paint the same tokens and the later stylesheet wins.

## Limitations

- **Settings live in this browser only.** They are stored in `localStorage` under
  `dsh.sidebar-logo.v1` (the three style switches ride in the same key), so
  another browser or profile starts from the shipped logo and the shipped
  styles. This is presentation, not configuration; nothing here reaches a model
  request or a session. If the browser blocks storage, the page says the change
  could not be saved.
- **Images are embedded, not served from a file path.** Picked raster images are
  downscaled in the page (96 px for the mark, 96 px tall and at most 640 px wide
  for the wordmark) and stored as `data:` URLs. SVG files stay vector and are
  capped at 256 KB.
- **Name and badge are plain text.** They use the shell's sidebar ink, so they
  follow light and dark themes; the mark and wordmark keep their own colors. The
  name ellipsizes when the sidebar narrows, and the badge is capped so it cannot
  run past the row.
- **The collapsed rail shows only the mark**, because that is the cell the shell
  renders when the sidebar folds.
- **"No logo" removes the row, the panel toggle included.** Use `Mod+B` to
  collapse the sidebar while that mode is on; the rail still carries its own
  expand button.
- **The presets carry other vendors' marks.** They are trademarks of Anthropic
  and OpenAI, used only to identify the tool each preset mirrors — see
  [Trademarks](#trademarks).

## Trademarks

The files under [`assets/`](assets/) are published by Anthropic and OpenAI and
are **not covered by this repository's MIT license**. They are included so a
preset can show a recognizable mark for the tool it represents; nothing was
redrawn, and the Codex light variant only recolors the stroke. Sources, hashes,
and the applicable rules are in [assets/SOURCES.md](assets/SOURCES.md).

This project is not affiliated with, endorsed by, or sponsored by Anthropic or
OpenAI. Both vendors' guidelines forbid using their marks in a way that suggests
endorsement or as part of your own product's name or logo.

## Files

| File | Purpose |
| --- | --- |
| `package.json` | Bundle manifest: patch, Client declaration, exports, icon. |
| `cordis.patch.yml` | Inserts the `sidebar-logo` Loader entry. |
| `index.js` | Host seat; imports nothing and registers nothing. |
| `client.js` | Brand occupants, Settings page, presets, storage, dictionaries, and the three ported Claude styles with their switches. |
| `locale/*.json` | Plugin Manager title and description. |
| `icon.svg` | Plugin icon. |
| `assets/` | Brand artwork for the presets, with sources and trademark notes. |
| `tools/embed-presets.mjs` | Regenerates the embedded artwork inside `client.js`. |

## License

MIT for the plugin code — see [LICENSE](LICENSE). The artwork in `assets/` is
excluded from that grant.
