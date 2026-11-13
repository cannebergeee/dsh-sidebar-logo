# Sidebar logo

English | [中文](README.zh.md)

A DeepSeek Harness plugin that replaces parts of the logo in the sidebar's
top-left corner — the DeepSeek whale, the `deepseek` wordmark, and the `HARNESS`
badge — with your own artwork, edited from a page inside Settings.

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
2. Fill in any combination of:
   - **Mark image** — a square image drawn at 24 × 24 px where the whale sits.
   - **Wordmark image** — a wide logo image after the mark.
   - **Hide the mark cell** — keep the mark cell empty instead of showing the
     shipped whale, for a wordmark image that already contains its own mark.
   - **Name** — plain text beside the mark.
   - **Badge** — a short tag after the name, like `HARNESS`.
3. The preview follows your edits, and so does the sidebar (about 200 ms after
   you stop typing, or immediately when you leave a field).

**A part you leave blank keeps the shipped DeepSeek artwork.** That is per part,
not all-or-nothing: set only the name and the whale stays; set only the mark and
the shipped wordmark stays. Turn on **Hide the mark cell** when the artwork you
supply replaces the whole lockup, so the whale does not sit beside it.

**Reset to shipped logo** clears every field and brings the original back.

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

## Limitations

- **Settings live in this browser only.** They are stored in `localStorage` under
  `dsh.sidebar-logo.v1`, so another browser or profile starts from the shipped
  logo. This is presentation, not configuration; nothing here reaches a model
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
  renders when the sidebar is folded.
- **No third-party artwork ships here.** The plugin draws nothing itself: bring
  your own image. Logos of other products stay their owners' trademarks — use
  them only where you are allowed to.

## Files

| File | Purpose |
| --- | --- |
| `package.json` | Bundle manifest: patch, Client declaration, exports, icon. |
| `cordis.patch.yml` | Inserts the `sidebar-logo` Loader entry. |
| `index.js` | Host seat; imports nothing and registers nothing. |
| `client.js` | Brand occupants, Settings page, storage, dictionaries. |
| `locale/*.json` | Plugin Manager title and description. |
| `icon.svg` | Plugin icon. |

## License

MIT — see [LICENSE](LICENSE).
