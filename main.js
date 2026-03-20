"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => KnitAndRebaseHeadingsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var path = __toESM(require("node:path"));
var DEFAULT_SETTINGS = {
  convertImageEmbedsToMarkdownLinks: false,
  rebaseHeadings: true,
  knittedMarkerMode: "both",
  imageAssetFolderMode: "knitted_attachments",
  stripObsidianComments: false
};
var KnitAndRebaseHeadingsPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.BUILD_STAMP = "2026-03-20";
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new KnitterSettingsTab(this));
    this.addCommand({
      id: "knit-current-file",
      name: "Knit current file",
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new import_obsidian.Notice("No active file.");
          return;
        }
        if (activeFile.extension !== "md") {
          new import_obsidian.Notice("Active file is not a markdown note.");
          return;
        }
        new KnitterRunModal(this, activeFile).open();
      }
    });
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async knitToSibling(activeFile) {
    await this.knitToSiblingWithSettings(activeFile, this.settings);
  }
  async knitToSiblingWithSettings(activeFile, settings) {
    var _a;
    try {
      let imageStats = null;
      let knittedBody = await this.knitFile(activeFile, settings);
      if (settings.convertImageEmbedsToMarkdownLinks) {
        const rewritten = await this.rewriteImagesForPandocByCopying(knittedBody, activeFile.path, settings);
        knittedBody = rewritten.text;
        imageStats = rewritten.stats;
      }
      if (settings.stripObsidianComments) {
        knittedBody = this.stripObsidianComments(knittedBody);
      }
      const knitted = this.ensureKnittedFrontmatter(knittedBody, settings);
      const knittedPath = activeFile.path.replace(/\.md$/i, "") + ".knitted.md";
      const existing = this.app.vault.getAbstractFileByPath(knittedPath);
      if (existing instanceof import_obsidian.TFile) {
        await this.app.vault.modify(existing, knitted);
      } else {
        await this.app.vault.create(knittedPath, knitted);
      }
      const suffix = imageStats ? ` (images: ${imageStats.created} created, ${imageStats.overwritten} overwritten, ${imageStats.missingAfterRun} missing \u2192 ${imageStats.vaultDir}/; links: ${imageStats.relativeDir}/...)` : "";
      const version = ((_a = this.manifest) == null ? void 0 : _a.version) ? ` v${this.manifest.version}` : "";
      if (imageStats) console.log("[Knitter] wrote images to", imageStats.vaultDir);
      new import_obsidian.Notice(`Knitter${version}: wrote knitted file: ${knittedPath}${suffix}`);
    } catch (err) {
      console.error("[Knitter] knit failed", err);
      new import_obsidian.Notice("Knit failed. Check console for details.");
    }
  }
  renderKnitterControls(containerEl, getSettings, setSettings) {
    let assetFolderDropdown = null;
    new import_obsidian.Setting(containerEl).setName("Rebase embedded headings").setDesc("When enabled, shifts embedded headings so the embedded root is one level below the surrounding host heading.").addToggle(
      (toggle) => toggle.setValue(getSettings().rebaseHeadings).onChange((value) => {
        setSettings({ ...getSettings(), rebaseHeadings: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("Copy embedded images and convert to Markdown links").setDesc(
      "Copies image embeds into the selected asset folder and rewrites all image references to Pandoc-friendly ![](path/to/file.png)."
    ).addToggle(
      (toggle) => toggle.setValue(getSettings().convertImageEmbedsToMarkdownLinks).onChange((value) => {
        setSettings({ ...getSettings(), convertImageEmbedsToMarkdownLinks: value });
        assetFolderDropdown == null ? void 0 : assetFolderDropdown.setDisabled(!value);
      })
    );
    new import_obsidian.Setting(containerEl).setName("Image asset folder").setDesc("Where copied images are written (relative to the current note folder).").addDropdown((dropdown) => {
      assetFolderDropdown = dropdown;
      dropdown.addOption("knitted_attachments", "knitted_attachments/").addOption("attachments_knitted", "attachments/knitted/").addOption("hidden_knitter_assets", ".knitter_assets/ (avoids organiser plugins)").setValue(getSettings().imageAssetFolderMode).onChange((value) => {
        if (value === "knitted_attachments" || value === "attachments_knitted" || value === "hidden_knitter_assets") {
          setSettings({ ...getSettings(), imageAssetFolderMode: value });
        }
      }).setDisabled(!getSettings().convertImageEmbedsToMarkdownLinks);
    });
    new import_obsidian.Setting(containerEl).setName("Strip Obsidian comments (%%...%%)").setDesc("Removes Obsidian comment blocks from the knitted output.").addToggle(
      (toggle) => toggle.setValue(getSettings().stripObsidianComments).onChange((value) => {
        setSettings({ ...getSettings(), stripObsidianComments: value });
      })
    );
    new import_obsidian.Setting(containerEl).setName("Knitted marker").setDesc("How to mark knitted output in YAML frontmatter.").addDropdown(
      (dropdown) => dropdown.addOption("property", "Property: knitted: true").addOption("tags", "Tags: [knitted]").addOption("both", "Both").setValue(getSettings().knittedMarkerMode).onChange((value) => {
        if (value === "property" || value === "tags" || value === "both") {
          setSettings({ ...getSettings(), knittedMarkerMode: value });
        }
      })
    );
  }
  parseWikiLinkInner(inner) {
    const [targetRaw, aliasRaw] = inner.split("|", 2);
    const target = (targetRaw != null ? targetRaw : "").trim();
    const alias = aliasRaw != null ? aliasRaw.trim() : null;
    const hashIndex = target.indexOf("#");
    if (hashIndex === -1) {
      return { linkpath: target, heading: null, alias };
    }
    const linkpath = target.slice(0, hashIndex).trim();
    const heading = target.slice(hashIndex + 1).trim();
    return { linkpath, heading: heading.length ? heading : null, alias };
  }
  renderInlineWikiLink(inner) {
    const parsed = this.parseWikiLinkInner(inner);
    if (parsed.alias && parsed.alias.length) return parsed.alias;
    return parsed.linkpath;
  }
  resolveNote(linkpath, sourcePath) {
    const dest = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
    return dest instanceof import_obsidian.TFile ? dest : null;
  }
  async knitFile(file, settings) {
    const text = await this.app.vault.read(file);
    return await this.knitText(text, file.path, /* @__PURE__ */ new Set([file.path]), file.path, settings, true);
  }
  async knitText(text, sourcePath, stack, rootPath, settings, allowCircularExpansion) {
    var _a;
    const inputLines = text.split(/\r?\n/);
    const outLines = [];
    let inFence = false;
    for (let i = 0; i < inputLines.length; i++) {
      const line = (_a = inputLines[i]) != null ? _a : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        outLines.push(line);
        continue;
      }
      if (inFence) {
        outLines.push(line);
        continue;
      }
      const standalone = this.parseStandaloneTransclusion(line);
      if (standalone) {
        const { inner, originalMarkup, isEmbed } = standalone;
        const parsed = this.parseWikiLinkInner(inner);
        if (!parsed.linkpath.length) {
          outLines.push(this.renderInlineWikiLink(inner));
          continue;
        }
        if (parsed.alias) {
          if (isEmbed) {
            const maybeFile = this.resolveNote(parsed.linkpath, sourcePath);
            if (maybeFile && maybeFile.extension !== "md") {
              outLines.push(originalMarkup);
              continue;
            }
          }
          outLines.push(this.renderInlineWikiLink(inner));
          continue;
        }
        const parentLevel = this.getCurrentParentHeadingLevel(inputLines, i);
        const knitted = await this.knitTransclusion(
          parsed.linkpath,
          parsed.heading,
          sourcePath,
          parentLevel,
          stack,
          originalMarkup,
          rootPath,
          settings,
          allowCircularExpansion
        );
        outLines.push(...knitted.split(/\r?\n/));
        continue;
      }
      outLines.push(this.replaceInlineWikiLinks(line, sourcePath, rootPath, settings));
    }
    return outLines.join("\n");
  }
  parseStandaloneTransclusion(line) {
    var _a;
    const trimmed = line.trim();
    const match = trimmed.match(/^(!)?\[\[([^\]]+)\]\]$/);
    if (!match) return null;
    const isEmbed = match[1] === "!";
    const inner = ((_a = match[2]) != null ? _a : "").trim();
    if (!inner.length) return null;
    return { inner, originalMarkup: line, isEmbed };
  }
  isFenceToggle(line) {
    return /^\s*(```|~~~)/.test(line);
  }
  replaceInlineWikiLinks(line, sourcePath, rootPath, settings) {
    var _a;
    let out = "";
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "!" && line[i + 1] === "[" && line[i + 2] === "[") {
        const close = line.indexOf("]]", i + 3);
        if (close !== -1) {
          const inner = line.slice(i + 3, close);
          out += this.renderInlineEmbed(inner, sourcePath, rootPath, settings, line.slice(i, close + 2));
          i = close + 1;
          continue;
        }
      }
      if (line[i] === "[" && line[i + 1] === "[" && line[i - 1] !== "!") {
        const close = line.indexOf("]]", i + 2);
        if (close !== -1) {
          const inner = line.slice(i + 2, close);
          out += this.renderInlineWikiLink(inner);
          i = close + 1;
          continue;
        }
      }
      out += (_a = line[i]) != null ? _a : "";
    }
    return out;
  }
  renderInlineEmbed(inner, sourcePath, rootPath, settings, originalMarkup) {
    const parsed = this.parseWikiLinkInner(inner);
    if (!parsed.linkpath.length) return this.renderInlineWikiLink(inner);
    const dest = this.resolveNote(parsed.linkpath, sourcePath);
    if (dest && dest.extension !== "md") {
      return originalMarkup;
    }
    return this.renderInlineWikiLink(inner);
  }
  async knitTransclusion(linkpath, heading, sourcePath, parentLevel, stack, originalMarkup, rootPath, settings, allowCircularExpansion) {
    const note = this.resolveNote(linkpath, sourcePath);
    if (!note) return `> Missing note: ${linkpath}`;
    if (note.extension !== "md") {
      return originalMarkup;
    }
    if (stack.has(note.path)) {
      if (!allowCircularExpansion) return `[[${linkpath}${heading ? `#${heading}` : ""}]]`;
      const raw2 = await this.app.vault.read(note);
      let extracted2 = raw2;
      if (heading) {
        const block = this.extractHeadingBlock(note, raw2, heading);
        if (!block) return `> Missing heading: ${linkpath}#${heading}`;
        extracted2 = block;
      } else {
        extracted2 = this.stripYamlFrontmatter(raw2);
      }
      const knittedEmbedded2 = await this.knitText(extracted2, note.path, stack, rootPath, settings, false);
      return settings.rebaseHeadings ? this.rebaseHeadings(knittedEmbedded2, parentLevel) : knittedEmbedded2;
    }
    const nextStack = new Set(stack);
    nextStack.add(note.path);
    const raw = await this.app.vault.read(note);
    let extracted = raw;
    if (heading) {
      const block = this.extractHeadingBlock(note, raw, heading);
      if (!block) return `> Missing heading: ${linkpath}#${heading}`;
      extracted = block;
    } else {
      extracted = this.stripYamlFrontmatter(raw);
    }
    const knittedEmbedded = await this.knitText(extracted, note.path, nextStack, rootPath, settings, allowCircularExpansion);
    return settings.rebaseHeadings ? this.rebaseHeadings(knittedEmbedded, parentLevel) : knittedEmbedded;
  }
  extractHeadingBlock(file, text, headingText) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const normalizedWanted = this.normalizeHeading(headingText);
    const lines = text.split(/\r?\n/);
    const cache = this.app.metadataCache.getFileCache(file);
    const headings = (_a = cache == null ? void 0 : cache.headings) != null ? _a : [];
    const sortedHeadings = headings.slice().sort((a, b) => a.position.start.line - b.position.start.line);
    if (sortedHeadings.length) {
      let target = sortedHeadings.find(
        (h) => h.heading === headingText.trim() || this.normalizeHeading(h.heading) === normalizedWanted
      );
      if (!target) {
        const prefixMatches = sortedHeadings.filter((h) => this.normalizeHeading(h.heading).startsWith(normalizedWanted));
        if (prefixMatches.length === 1) target = prefixMatches[0];
      }
      if (!target) return null;
      const startLine = target.position.start.line;
      const startLevel2 = target.level;
      let endLineExclusive = lines.length;
      for (const h of sortedHeadings) {
        if (h.position.start.line <= startLine) continue;
        if (h.level <= startLevel2) {
          endLineExclusive = h.position.start.line;
          break;
        }
      }
      return lines.slice(startLine, endLineExclusive).join("\n");
    }
    let inFence = false;
    let startIndex = -1;
    let startLevel = 0;
    let prefixCandidates = [];
    for (let i = 0; i < lines.length; i++) {
      const line = (_b = lines[i]) != null ? _b : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (!match) continue;
      const level = ((_c = match[1]) != null ? _c : "").length;
      const textPart = ((_d = match[2]) != null ? _d : "").trim();
      if (textPart === headingText.trim() || this.normalizeHeading(textPart) === normalizedWanted) {
        startIndex = i;
        startLevel = level;
        break;
      }
      const normalizedHere = this.normalizeHeading(textPart);
      if (normalizedHere.startsWith(normalizedWanted)) {
        prefixCandidates.push({ index: i, level });
      }
    }
    if (startIndex === -1 && prefixCandidates.length === 1) {
      startIndex = (_f = (_e = prefixCandidates[0]) == null ? void 0 : _e.index) != null ? _f : -1;
      startLevel = (_h = (_g = prefixCandidates[0]) == null ? void 0 : _g.level) != null ? _h : 0;
    }
    if (startIndex === -1) return null;
    let endIndexExclusive = lines.length;
    inFence = false;
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = (_i = lines[i]) != null ? _i : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (!match) continue;
      const level = ((_j = match[1]) != null ? _j : "").length;
      if (level <= startLevel) {
        endIndexExclusive = i;
        break;
      }
    }
    return lines.slice(startIndex, endIndexExclusive).join("\n");
  }
  getCurrentParentHeadingLevel(hostLines, insertionLineIndex) {
    var _a, _b;
    let inFence = false;
    let lastHeadingLevel = 0;
    for (let i = 0; i < insertionLineIndex; i++) {
      const line = (_a = hostLines[i]) != null ? _a : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const match = line.match(/^(#{1,6})\s+/);
      if (!match) continue;
      lastHeadingLevel = ((_b = match[1]) != null ? _b : "").length;
    }
    return lastHeadingLevel;
  }
  getFirstHeadingLevel(text) {
    var _a;
    const lines = text.split(/\r?\n/);
    let inFence = false;
    for (const line of lines) {
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const match = line.match(/^(#{1,6})\s+/);
      if (!match) continue;
      return ((_a = match[1]) != null ? _a : "").length;
    }
    return null;
  }
  rebaseHeadings(text, parentLevel) {
    var _a, _b, _c, _d, _e;
    const rootLevel = this.getFirstHeadingLevel(text);
    if (rootLevel == null) return text;
    const targetRootLevel = this.clampHeadingLevel(parentLevel + 1);
    const delta = targetRootLevel - rootLevel;
    if (delta === 0) return text;
    const lines = text.split(/\r?\n/);
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = (_a = lines[i]) != null ? _a : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const match = line.match(/^(\s*)(#{1,6})(\s+)(.*)$/);
      if (!match) continue;
      const indent = (_b = match[1]) != null ? _b : "";
      const hashes = (_c = match[2]) != null ? _c : "";
      const spacing = (_d = match[3]) != null ? _d : " ";
      const rest = (_e = match[4]) != null ? _e : "";
      const oldLevel = hashes.length;
      const newLevel = this.clampHeadingLevel(oldLevel + delta);
      lines[i] = `${indent}${"#".repeat(newLevel)}${spacing}${rest}`;
    }
    return lines.join("\n");
  }
  clampHeadingLevel(level) {
    return Math.min(6, Math.max(1, level));
  }
  normalizeHeading(text) {
    return text.normalize("NFKC").toLowerCase().trim().replace(/[‐‑‒–—]/g, "-").replace(/[`*_~=]/g, "").replace(/\u00a0/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/-/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  }
  stripYamlFrontmatter(text) {
    var _a, _b, _c;
    const lines = text.split(/\r?\n/);
    const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
    if (firstNonEmpty === -1) return text;
    if (((_a = lines[firstNonEmpty]) != null ? _a : "").trim() !== "---") return text;
    for (let i = firstNonEmpty + 1; i < lines.length; i++) {
      const t = ((_b = lines[i]) != null ? _b : "").trim();
      if (t === "---" || t === "...") {
        let start = i + 1;
        if (((_c = lines[start]) != null ? _c : "").trim() === "") start++;
        return lines.slice(start).join("\n");
      }
    }
    return text;
  }
  ensureKnittedFrontmatter(text, settings) {
    const lines = text.split(/\r?\n/);
    const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
    if (firstNonEmpty !== -1 && lines[firstNonEmpty] === "---") {
      const closingIndex = this.findFrontmatterClose(lines, firstNonEmpty);
      if (closingIndex !== -1) {
        const before = lines.slice(0, firstNonEmpty);
        const fm = lines.slice(firstNonEmpty + 1, closingIndex);
        const after = lines.slice(closingIndex + 1);
        const nextFm = this.upsertKnittedFrontmatterFields(fm, settings.knittedMarkerMode);
        return [...before, "---", ...nextFm, "---", ...after].join("\n");
      }
    }
    const prefixLines = ["---"];
    if (settings.knittedMarkerMode === "property" || settings.knittedMarkerMode === "both") {
      prefixLines.push("knitted: true");
    }
    if (settings.knittedMarkerMode === "tags" || settings.knittedMarkerMode === "both") {
      prefixLines.push("tags: [knitted]");
    }
    prefixLines.push("---", "");
    const prefix = prefixLines.join("\n");
    return prefix + text;
  }
  findFrontmatterClose(lines, openIndex) {
    var _a;
    for (let i = openIndex + 1; i < lines.length; i++) {
      const t = ((_a = lines[i]) != null ? _a : "").trim();
      if (t === "---" || t === "...") return i;
    }
    return -1;
  }
  upsertKnittedFrontmatterFields(frontmatterLines, mode) {
    var _a, _b, _c, _d, _e, _f;
    const wantsProperty = mode === "property" || mode === "both";
    const wantsTags = mode === "tags" || mode === "both";
    let hasKnitted = false;
    let tagsHandled = false;
    const next = [...frontmatterLines];
    if (wantsProperty) {
      for (let i = 0; i < next.length; i++) {
        const line = (_a = next[i]) != null ? _a : "";
        if (/^\s*knitted\s*:/.test(line)) {
          next[i] = "knitted: true";
          hasKnitted = true;
          break;
        }
      }
      if (!hasKnitted) next.push("knitted: true");
    }
    if (!wantsTags) return next;
    for (let i = 0; i < next.length; i++) {
      const line = (_b = next[i]) != null ? _b : "";
      const mInline = line.match(/^\s*tags\s*:\s*\[(.*)\]\s*$/);
      if (mInline) {
        const raw = ((_c = mInline[1]) != null ? _c : "").trim();
        const parts = raw.length ? raw.split(",").map((p) => p.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean) : [];
        if (!parts.some((p) => p.toLowerCase() === "knitted")) parts.push("knitted");
        next[i] = `tags: [${parts.join(", ")}]`;
        tagsHandled = true;
        break;
      }
      const mScalar = line.match(/^\s*tags\s*:\s*(.+)\s*$/);
      if (mScalar && !/^\s*tags\s*:\s*$/.test(line)) {
        const scalar = ((_d = mScalar[1]) != null ? _d : "").trim().replace(/^['"]|['"]$/g, "");
        const tags = [];
        if (scalar.length && scalar.toLowerCase() !== "knitted") tags.push(scalar);
        tags.push("knitted");
        next[i] = `tags: [${tags.join(", ")}]`;
        tagsHandled = true;
        break;
      }
      if (/^\s*tags\s*:\s*$/.test(line)) {
        const existing = [];
        let j = i + 1;
        for (; j < next.length; j++) {
          const li = (_e = next[j]) != null ? _e : "";
          const mm = li.match(/^\s*-\s*(.+?)\s*$/);
          if (!mm) break;
          existing.push(((_f = mm[1]) != null ? _f : "").trim().replace(/^['"]|['"]$/g, ""));
        }
        if (!existing.some((t) => t.toLowerCase() === "knitted")) {
          next.splice(j, 0, "  - knitted");
        }
        tagsHandled = true;
        break;
      }
    }
    if (!tagsHandled) next.push("tags: [knitted]");
    return next;
  }
  isImageFile(file) {
    const ext = file.extension.toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tif", "tiff", "avif"].includes(ext);
  }
  async rewriteImagesForPandocByCopying(text, rootPath, settings) {
    var _a, _b, _c, _d, _e, _f;
    const context = await this.createImageCopyContext(rootPath, settings.imageAssetFolderMode);
    const lines = text.split(/\r?\n/);
    const out = [];
    let inFence = false;
    let i = 0;
    const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
    if (firstNonEmpty !== -1 && ((_a = lines[firstNonEmpty]) != null ? _a : "").trim() === "---") {
      for (; i < firstNonEmpty; i++) out.push((_b = lines[i]) != null ? _b : "");
      out.push((_c = lines[i]) != null ? _c : "---");
      for (i = firstNonEmpty + 1; i < lines.length; i++) {
        out.push((_d = lines[i]) != null ? _d : "");
        const t = ((_e = lines[i]) != null ? _e : "").trim();
        if (t === "---" || t === "...") {
          i++;
          break;
        }
      }
    }
    for (; i < lines.length; i++) {
      const line = (_f = lines[i]) != null ? _f : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        out.push(line);
        continue;
      }
      if (inFence) {
        out.push(line);
        continue;
      }
      const afterWikilinks = await this.rewriteObsidianImageEmbedsInLine(line, rootPath, context);
      out.push(await this.rewriteMarkdownImagesInLineByCopying(afterWikilinks, rootPath, context));
    }
    await this.sleep(250);
    context.stats.missingAfterRun = this.countMissingWrittenAssets(context);
    return { text: out.join("\n"), stats: context.stats };
  }
  async rewriteObsidianImageEmbedsInLine(line, rootPath, context) {
    let out = "";
    let i = 0;
    while (i < line.length) {
      const start = line.indexOf("![[", i);
      if (start === -1) {
        out += line.slice(i);
        break;
      }
      const close = line.indexOf("]]", start + 3);
      if (close === -1) {
        out += line.slice(i);
        break;
      }
      out += line.slice(i, start);
      const inner = line.slice(start + 3, close);
      const parsed = this.parseWikiLinkInner(inner);
      const dest = parsed.linkpath.length ? this.resolveNote(parsed.linkpath, rootPath) : null;
      if (dest && dest.extension !== "md" && this.isImageFile(dest)) {
        const rel = await this.copyImageToAssetFolder(dest, context);
        out += `![](${rel})`;
      } else {
        out += line.slice(start, close + 2);
      }
      i = close + 2;
    }
    return out;
  }
  async rewriteMarkdownImagesInLineByCopying(line, rootPath, context) {
    var _a, _b;
    let out = "";
    let i = 0;
    while (i < line.length) {
      const start = line.indexOf("![", i);
      if (start === -1) {
        out += line.slice(i);
        break;
      }
      const linkOpen = line.indexOf("](", start + 2);
      if (linkOpen === -1) {
        out += line.slice(i);
        break;
      }
      out += line.slice(i, start);
      out += line.slice(start, linkOpen + 2);
      let j = linkOpen + 2;
      while (j < line.length && /\s/.test((_a = line[j]) != null ? _a : "")) j++;
      let destStart = j;
      let depth = 0;
      for (; j < line.length; j++) {
        const ch = (_b = line[j]) != null ? _b : "";
        if (ch === "(") depth++;
        if (ch === ")") {
          if (depth === 0) break;
          depth--;
        }
      }
      if (j >= line.length) {
        out += line.slice(destStart);
        break;
      }
      const inside = line.slice(destStart, j);
      out += await this.rewriteMarkdownImageDestinationInsideByCopying(inside, rootPath, context);
      out += ")";
      i = j + 1;
    }
    return out;
  }
  async rewriteMarkdownImageDestinationInsideByCopying(inside, rootPath, context) {
    var _a, _b;
    const leading = (_b = (_a = inside.match(/^\s*/)) == null ? void 0 : _a[0]) != null ? _b : "";
    const body = inside.slice(leading.length);
    if (body.startsWith("<")) {
      const close = body.indexOf(">");
      if (close !== -1) {
        const destRaw = body.slice(1, close);
        const tail = body.slice(close + 1);
        const nextDest2 = await this.rewriteMarkdownImageDestinationByCopying(destRaw, rootPath, context);
        return `${leading}${nextDest2}${tail}`;
      }
    }
    const split = this.splitMarkdownLinkDestination(body);
    if (!split) return inside;
    const nextDest = await this.rewriteMarkdownImageDestinationByCopying(split.dest, rootPath, context);
    return `${leading}${nextDest}${split.tail}`;
  }
  async rewriteMarkdownImageDestinationByCopying(destRaw, rootPath, context) {
    const destTrimmed = destRaw.trim();
    if (!destTrimmed.length) return destRaw;
    const unwrapped = destTrimmed.startsWith("<") && destTrimmed.endsWith(">") ? destTrimmed.slice(1, -1).trim() : destTrimmed;
    if (unwrapped.startsWith(`${context.assetsRelDir}/`)) {
      return unwrapped;
    }
    const unwrappedNoPrefix = unwrapped.replace(/^\.\//, "");
    if (!unwrappedNoPrefix.includes("/")) {
      const forced = await this.forceBareImageIntoKnittedAttachments(unwrappedNoPrefix, rootPath, context);
      if (forced) return forced;
    }
    const basename = path.posix.basename(unwrappedNoPrefix);
    const hasDir = unwrappedNoPrefix.includes("/");
    if (!hasDir && this.isGeneratedKnittedAttachmentFilename(basename, context.noteSlug)) {
      const alreadyInAssets = this.app.vault.getAbstractFileByPath(
        this.normalizeVaultPath(path.posix.join(context.assetsDir, basename))
      );
      if (alreadyInAssets instanceof import_obsidian.TFile) return `${context.assetsRelDir}/${basename}`;
    }
    const unescaped = this.unescapeMarkdownLinkDestination(unwrapped);
    const decoded = this.safeDecodePath(unescaped);
    const candidates = [];
    if (decoded.length) candidates.push(decoded);
    if (unescaped.length) candidates.push(unescaped);
    for (const c of candidates) {
      const normalized = c.replace(/^\.\//, "").replace(/^\/+/, "");
      const resolved = this.app.metadataCache.getFirstLinkpathDest(normalized, rootPath);
      if (resolved instanceof import_obsidian.TFile && this.isImageFile(resolved)) {
        return await this.copyImageToAssetFolder(resolved, context);
      }
    }
    const maybeBySlug = this.findNearbyImageBySlug(decoded || unescaped || unwrapped, rootPath);
    if (maybeBySlug) {
      return await this.copyImageToAssetFolder(maybeBySlug, context);
    }
    return decoded || unescaped || destTrimmed;
  }
  async forceBareImageIntoKnittedAttachments(bare, rootPath, context) {
    const dest = (bare != null ? bare : "").trim();
    if (!dest.length) return null;
    const existingInAssets = this.app.vault.getAbstractFileByPath(
      this.normalizeVaultPath(path.posix.join(context.assetsDir, dest))
    );
    if (existingInAssets instanceof import_obsidian.TFile && this.isImageFile(existingInAssets)) {
      return `${context.assetsRelDir}/${dest}`;
    }
    const unescaped = this.unescapeMarkdownLinkDestination(dest);
    const decoded = this.safeDecodePath(unescaped);
    const candidates = [decoded, unescaped].filter(Boolean);
    for (const c of candidates) {
      const normalized = c.replace(/^\.\//, "").replace(/^\/+/, "");
      const resolved = this.app.metadataCache.getFirstLinkpathDest(normalized, rootPath);
      if (resolved instanceof import_obsidian.TFile && this.isImageFile(resolved)) {
        if (this.isGeneratedKnittedAttachmentFilename(dest, context.noteSlug)) {
          return await this.copyImageToExactKnittedAttachmentName(resolved, dest, context);
        }
        return await this.copyImageToAssetFolder(resolved, context);
      }
    }
    const maybeBySlug = this.findNearbyImageBySlug(dest, rootPath);
    if (maybeBySlug) {
      if (this.isGeneratedKnittedAttachmentFilename(dest, context.noteSlug)) {
        return await this.copyImageToExactKnittedAttachmentName(maybeBySlug, dest, context);
      }
      return await this.copyImageToAssetFolder(maybeBySlug, context);
    }
    if (this.looksLikeImageFilename(dest)) {
      return `${context.assetsRelDir}/${dest}`;
    }
    return null;
  }
  looksLikeImageFilename(filename) {
    const ext = (path.posix.extname(filename) || "").slice(1).toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tif", "tiff", "avif"].includes(ext);
  }
  async copyImageToExactKnittedAttachmentName(source, filename, context) {
    const destVaultPath = this.normalizeVaultPath(path.posix.join(context.assetsDir, filename));
    const rel = `${context.assetsRelDir}/${path.posix.basename(destVaultPath)}`;
    const existing = this.app.vault.getAbstractFileByPath(destVaultPath);
    const data = await this.app.vault.readBinary(source);
    if (existing instanceof import_obsidian.TFile) {
      await this.app.vault.modifyBinary(existing, data);
      context.stats.overwritten++;
    } else {
      await this.app.vault.createBinary(destVaultPath, data);
      context.stats.created++;
    }
    context.writtenDestVaultPaths.add(destVaultPath);
    context.copiedBySourcePath.set(source.path, rel);
    return rel;
  }
  isGeneratedKnittedAttachmentFilename(filename, noteSlug) {
    var _a;
    if (!filename.startsWith(`${noteSlug}-`)) return false;
    const m = filename.match(new RegExp(`^${this.escapeRegExp(noteSlug)}-(\\d+)\\.(\\w+)$`, "i"));
    if (!m) return false;
    const ext = ((_a = m[2]) != null ? _a : "").toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tif", "tiff", "avif"].includes(ext);
  }
  escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  async createImageCopyContext(rootPath, mode) {
    const rootDir = this.normalizeVaultPath(path.posix.dirname(rootPath));
    const assetsRelDir = this.getAssetsRelDir(mode);
    const assetsDir = this.normalizeVaultPath(path.posix.join(rootDir, assetsRelDir));
    const attachmentsDir = this.normalizeVaultPath(path.posix.join(rootDir, "attachments"));
    if (mode === "attachments_knitted" && attachmentsDir) await this.ensureFolderExists(attachmentsDir);
    await this.ensureFolderExists(assetsDir);
    await this.ensureKeepFile(assetsDir);
    const noteBasename = path.posix.basename(rootPath, ".md");
    const noteSlug = this.slugifyBasename(noteBasename) || "note";
    if (attachmentsDir && assetsDir) {
      await this.migrateGeneratedAttachmentsIntoAssetDir(noteSlug, attachmentsDir, assetsDir);
    }
    return {
      rootPath,
      noteDir: rootDir,
      attachmentsDir,
      assetsRelDir,
      assetsDir,
      noteSlug,
      nextIndex: 1,
      copiedBySourcePath: /* @__PURE__ */ new Map(),
      usedDestVaultPaths: /* @__PURE__ */ new Set(),
      writtenDestVaultPaths: /* @__PURE__ */ new Set(),
      stats: {
        relativeDir: assetsRelDir,
        vaultDir: assetsDir,
        created: 0,
        overwritten: 0,
        missingAfterRun: 0
      }
    };
  }
  async migrateGeneratedAttachmentsIntoAssetDir(noteSlug, attachmentsDir, assetsDir) {
    const folder = this.app.vault.getAbstractFileByPath(attachmentsDir);
    const children = folder == null ? void 0 : folder.children;
    if (!Array.isArray(children)) return;
    for (const child of children) {
      if (!(child instanceof import_obsidian.TFile)) continue;
      if (!this.isImageFile(child)) continue;
      if (!this.isGeneratedKnittedAttachmentFilename(child.name, noteSlug)) continue;
      const destPath = this.normalizeVaultPath(path.posix.join(assetsDir, child.name));
      if (destPath === child.path) continue;
      const existing = this.app.vault.getAbstractFileByPath(destPath);
      try {
        if (existing instanceof import_obsidian.TFile) {
          continue;
        }
        await this.app.vault.rename(child, destPath);
      } catch (err) {
        console.warn("[Knitter] Failed migrating generated attachment into asset folder", child.path, destPath, err);
      }
    }
  }
  async ensureFolderExists(folderPath) {
    var _a, _b;
    const existing = this.app.vault.getAbstractFileByPath(folderPath);
    if (existing instanceof import_obsidian.TFile) {
      throw new Error(`Cannot create folder ${folderPath}: a file exists at that path.`);
    }
    if (existing) return;
    try {
      await this.app.vault.createFolder(folderPath);
    } catch (err) {
      const msg = String((_b = (_a = err == null ? void 0 : err.message) != null ? _a : err) != null ? _b : "");
      if (/already exists/i.test(msg)) return;
      console.warn("[Knitter] Failed to create folder", folderPath, err);
      throw err;
    }
  }
  async ensureKeepFile(folderPath) {
    var _a, _b;
    const keepPath = this.normalizeVaultPath(path.posix.join(folderPath, ".knitter-keep"));
    const existing = this.app.vault.getAbstractFileByPath(keepPath);
    if (existing instanceof import_obsidian.TFile) return;
    try {
      await this.app.vault.create(
        keepPath,
        `This file keeps ${folderPath}/ from being auto-removed by other plugins.
`
      );
    } catch (err) {
      const msg = String((_b = (_a = err == null ? void 0 : err.message) != null ? _a : err) != null ? _b : "");
      if (/already exists/i.test(msg)) return;
      console.warn("[Knitter] Failed to create keep file", keepPath, err);
    }
  }
  async copyImageToKnittedAttachments(source, context) {
    return this.copyImageToAssetFolder(source, context);
  }
  async copyImageToAssetFolder(source, context) {
    const cached = context.copiedBySourcePath.get(source.path);
    if (cached) return cached;
    const chosenVaultPath = this.chooseNumberedAttachmentVaultPathForNextIndex(source, context);
    const rel = `${context.assetsRelDir}/${path.posix.basename(chosenVaultPath)}`;
    context.copiedBySourcePath.set(source.path, rel);
    const existing = this.app.vault.getAbstractFileByPath(chosenVaultPath);
    const data = await this.app.vault.readBinary(source);
    if (existing instanceof import_obsidian.TFile) {
      await this.app.vault.modifyBinary(existing, data);
      context.stats.overwritten++;
    } else {
      await this.app.vault.createBinary(chosenVaultPath, data);
      context.stats.created++;
    }
    context.writtenDestVaultPaths.add(chosenVaultPath);
    return rel;
  }
  chooseNumberedAttachmentVaultPathForNextIndex(source, context) {
    const folderVaultPath = this.normalizeVaultPath(context.assetsDir);
    const ext = source.extension ? `.${source.extension.toLowerCase()}` : "";
    for (let idx = context.nextIndex; idx < context.nextIndex + 1e5; idx++) {
      const name = `${context.noteSlug}-${idx}${ext}`;
      const candidate = this.normalizeVaultPath(path.posix.join(folderVaultPath, name));
      if (context.usedDestVaultPaths.has(candidate)) continue;
      context.usedDestVaultPaths.add(candidate);
      context.nextIndex = idx + 1;
      return candidate;
    }
    const fallback = this.normalizeVaultPath(path.posix.join(folderVaultPath, `${context.noteSlug}-${Date.now()}${ext}`));
    context.usedDestVaultPaths.add(fallback);
    context.nextIndex++;
    return fallback;
  }
  findNearbyImageBySlug(dest, rootPath) {
    const cleaned = (dest != null ? dest : "").trim().replace(/^\.\/+/, "").replace(/^\/+/, "");
    if (!cleaned.length) return null;
    const destBasename = path.posix.basename(cleaned);
    if (!destBasename.length) return null;
    const noteDir = this.normalizeVaultPath(path.posix.dirname(rootPath));
    const searchDirs = [
      noteDir,
      this.normalizeVaultPath(path.posix.join(noteDir, "knitted_attachments")),
      this.normalizeVaultPath(path.posix.join(noteDir, "attachments/knitted")),
      this.normalizeVaultPath(path.posix.join(noteDir, "attachments")),
      this.normalizeVaultPath(path.posix.join(noteDir, "attachment")),
      this.normalizeVaultPath(path.posix.join(noteDir, "assets")),
      this.normalizeVaultPath(path.posix.join(noteDir, "Assets"))
    ];
    const wantedSlug = this.slugifyFilename(destBasename);
    for (const dir of searchDirs) {
      if (!dir) continue;
      const folder = this.app.vault.getAbstractFileByPath(dir);
      const asAny = folder;
      const children = asAny == null ? void 0 : asAny.children;
      if (!Array.isArray(children)) continue;
      for (const child of children) {
        if (!(child instanceof import_obsidian.TFile)) continue;
        if (!this.isImageFile(child)) continue;
        if (this.slugifyFilename(child.name) === wantedSlug) return child;
      }
    }
    return null;
  }
  slugifyFilename(filename) {
    const dotIndex = filename.lastIndexOf(".");
    const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
    const ext = dotIndex >= 0 ? filename.slice(dotIndex) : "";
    const slug = base.normalize("NFKC").replace(/[‐‑‒–—]/g, "-").replace(/[^A-Za-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return `${slug}${ext}`;
  }
  slugifyBasename(name) {
    return name.normalize("NFKC").replace(/[‐‑‒–—]/g, "-").replace(/[^A-Za-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  getAssetsRelDir(mode) {
    if (mode === "attachments_knitted") return "attachments/knitted";
    if (mode === "hidden_knitter_assets") return ".knitter_assets";
    return "knitted_attachments";
  }
  sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  countMissingWrittenAssets(context) {
    let missing = 0;
    for (const p of context.writtenDestVaultPaths) {
      const af = this.app.vault.getAbstractFileByPath(p);
      if (!(af instanceof import_obsidian.TFile)) missing++;
    }
    return missing;
  }
  normalizeVaultPath(p) {
    let out = (p != null ? p : "").replace(/\\/g, "/");
    out = path.posix.normalize(out);
    out = out.replace(/^\.\/+/, "").replace(/^\/+/, "");
    if (out === ".") return "";
    return out;
  }
  splitMarkdownLinkDestination(body) {
    var _a, _b;
    if (!body.length) return null;
    let i = 0;
    while (i < body.length && /\s/.test((_a = body[i]) != null ? _a : "")) i++;
    if (i >= body.length) return null;
    const start = i;
    for (; i < body.length; i++) {
      const ch = (_b = body[i]) != null ? _b : "";
      if (!/\s/.test(ch)) continue;
      if (!this.isEscaped(body, i)) break;
    }
    const dest = body.slice(start, i);
    const tail = body.slice(i);
    return { dest, tail };
  }
  isEscaped(text, index) {
    let count = 0;
    for (let i = index - 1; i >= 0; i--) {
      if (text[i] !== "\\") break;
      count++;
    }
    return count % 2 === 1;
  }
  unescapeMarkdownLinkDestination(dest) {
    return dest.replace(/\\([\\ ()])/g, "$1");
  }
  safeDecodePath(p) {
    const parts = p.split("/").filter((seg) => seg.length > 0);
    const decoded = parts.map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch (e) {
        return seg;
      }
    });
    const prefix = p.startsWith("/") ? "/" : "";
    const suffix = p.endsWith("/") ? "/" : "";
    return prefix + decoded.join("/") + suffix;
  }
  stripObsidianComments(text) {
    var _a, _b, _c, _d, _e, _f;
    const lines = text.split(/\r?\n/);
    const out = [];
    let i = 0;
    const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
    if (firstNonEmpty !== -1 && ((_a = lines[firstNonEmpty]) != null ? _a : "").trim() === "---") {
      for (; i < firstNonEmpty; i++) out.push((_b = lines[i]) != null ? _b : "");
      out.push((_c = lines[i]) != null ? _c : "---");
      for (i = firstNonEmpty + 1; i < lines.length; i++) {
        out.push((_d = lines[i]) != null ? _d : "");
        const t = ((_e = lines[i]) != null ? _e : "").trim();
        if (t === "---" || t === "...") {
          i++;
          break;
        }
      }
    }
    let inFence = false;
    let inComment = false;
    for (; i < lines.length; i++) {
      const line = (_f = lines[i]) != null ? _f : "";
      if (this.isFenceToggle(line)) {
        inFence = !inFence;
        out.push(line);
        continue;
      }
      if (inFence) {
        out.push(line);
        continue;
      }
      let j = 0;
      let built = "";
      while (j < line.length) {
        const idx = line.indexOf("%%", j);
        if (idx === -1) {
          if (!inComment) built += line.slice(j);
          break;
        }
        if (!inComment) {
          built += line.slice(j, idx);
          inComment = true;
          j = idx + 2;
          continue;
        }
        inComment = false;
        j = idx + 2;
      }
      out.push(built.trimEnd());
    }
    return out.join("\n");
  }
};
var KnitterSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Knitter" });
    this.plugin.renderKnitterControls(
      containerEl,
      () => this.plugin.settings,
      (next) => {
        this.plugin.settings = next;
        void this.plugin.saveSettings();
      }
    );
  }
};
var KnitterRunModal = class extends import_obsidian.Modal {
  constructor(plugin, file) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
  }
  onOpen() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    const version = ((_a = this.plugin.manifest) == null ? void 0 : _a.version) ? ` v${this.plugin.manifest.version}` : "";
    contentEl.createEl("h2", { text: `Knitter${version}` });
    let runSettings = { ...this.plugin.settings };
    this.plugin.renderKnitterControls(contentEl, () => runSettings, (next) => {
      runSettings = next;
    });
    new import_obsidian.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Knit").setCta().onClick(async () => {
        btn.setDisabled(true);
        await this.plugin.knitToSiblingWithSettings(this.file, runSettings);
        this.close();
      })
    ).addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};
