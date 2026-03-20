# Knitter: Knit Embeds and Rebase Headings

Knits the current Obsidian note into a clean Markdown output by resolving inline embeds and rebasing headings.

## Why use Knitter?
Knitter is useful when you write with Obsidian embeds, but need a flattened Markdown file for downstream conversion workflows such as Pandoc to HTML, DOCX, and other formats.

## What does Knitter do?
Resolves standalone Obsidian wikilink embeds (`![[note#section]]`) and image embeds (`![[your_face.png]]`) recursively into a knitted outfile with the suffix `*.knitted.md`.

Knitter can also rebase embedded heading levels, collect image attachments into a `knitted/` directory, and strip native obsidian comments (`%%..%%`).

## Usage
Defaults are configured in the plugin settings tab. The command always shows a run modal, so per-run overrides are possible.

### 1. Rebase headings
Rebases headings within `![[note#section]]` embeds so that the embedded root heading is moved to one level below the surrounding host heading. Knitter does not rebase further than heading 6 this is not supported in Markdown.

### 2. Copy embedded images and convert to Markdown links
Copies embedded images into the selected asset folder and rewrites image references to Pandoc-friendly Markdown links:

- `![[image.png]]` → `![](knitted_attachments/<note-name>-1.png)` (default)
- `![](some/path/or/bare.png)` → `![](knitted_attachments/<note-name>-N.png)` when resolvable

Choose where images go via the **Image asset folder** setting, relative to the current note:

- `knitted_attachments/` — less likely to be modified by other attachment-management plugins
- `attachments/knitted/` — tidier, but with some risk of being reorganised by other plugins
  - If you choose `attachments/knitted/` and the current note folder does not already contain an `attachments/` folder, Knitter will create it.
- `.knitter_assets/` — hidden folder; useful if another plugin keeps reorganising attachments

Knitter copies or overwrites files as needed. It does not modify the original attachments.

### 3. Knitted frontmatter
Marks the knitted output with frontmatter such as `knitted: true`, `tags: [knitted]`, or both.

### 4. Strip Obsidian comments
Optionally removes Obsidian comment blocks `%% ... %%` from the knitted output, while skipping fenced code blocks.

## License
GPL-3.0-only (see `LICENSE`).