#!/usr/bin/env node
/**
 * Thrivebuild blog builder. No dependencies, Node 18+.
 *
 *   node scripts/build-blog.js
 *
 * Reads content/posts/YYYY-MM-DD-slug.md and writes:
 *   blog/<slug>.html     one page per post (served at /blog/<slug>)
 *   blog/index.html      the blog index, newest first (served at /blog)
 *   blog/rss.xml         RSS 2.0 feed
 *   sitemap.xml          the block between <!-- blog:start --> and <!-- blog:end -->
 *   index.html           the block between <!-- blog-latest:start --> and <!-- blog-latest:end -->
 *
 * The site header, footer and booking section are copied from case-studies.html,
 * so the blog always matches the live nav and footer.
 *
 * Rule checks from content/BLOG-RULES.md: errors stop the build (so a broken
 * post never deploys), warnings are printed but do not.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const OUT_DIR = path.join(ROOT, "blog");
const SITE = "https://thrivebuild.co";
const THUMB = `${SITE}/assets/img/thrivebuild-featured-thumbnail.png`;
const AUTHOR_LINE = "Sam Adebayo, Founder of Thrivebuild";
const REQUIRED = ["title", "description", "date", "slug", "tags", "author", "reading_time"];
// Roofing as a trade is off-message; "roof" itself is fine (site surveys look at roofs)
const BANNED = /\b(roofing|roofers?|remodel\w*|kitchens?)\b/i;
const INTERNAL_TARGETS = /^\/(solar|pricing|case-studies|blog\/[a-z0-9-]+)\/?(#.*)?$/;

const errors = [];
const warnings = [];
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const eol = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escXml = escHtml;
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const niceDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const rfc822 = (iso) => new Date(`${iso}T09:00:00Z`).toUTCString();

// ---------------------------------------------------------------------------
// Front matter: simple "key: value" lines, tags as [a, b] or "- item" lists
// ---------------------------------------------------------------------------
function parseFrontMatter(raw, file) {
  const m = raw.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { errors.push(`${file}: missing front matter (--- block at the top)`); return null; }
  const data = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { data[listKey].push(unquote(item[1])); continue; }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) { errors.push(`${file}: can't read front matter line "${line}"`); continue; }
    const [, key, val] = kv;
    if (val === "") { data[key] = []; listKey = key; continue; }
    listKey = null;
    if (/^\[.*\]$/.test(val)) data[key] = val.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean);
    else data[key] = unquote(val);
  }
  return { data, body: m[2] };
}
function unquote(s) { return s.replace(/^(["'])(.*)\1$/, "$2"); }

// ---------------------------------------------------------------------------
// Markdown to HTML (the subset posts need)
// Blocks: ## / ### headings, paragraphs, - and 1. lists, > quotes, | tables, ---
// Inline: **bold**, *italic*, `code`, [text](url)
// ---------------------------------------------------------------------------
function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = escHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const ext = /^https?:\/\//.test(url) && !url.startsWith(SITE);
    return ext
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : `<a href="${url}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escHtml(codes[+i])}</code>`);
}

function markdown(md, file = "post") {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const toc = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{2,3}\s|[-*]\s|\d+\.\s|>|\||---\s*$)/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      const level = m[1].length;
      const id = slugify(m[2]);
      if (level === 2) toc.push({ id, text: m[2] });
      out.push(`<h${level} id="${id}">${inline(m[2])}</h${level}>`);
      i++;
    } else if (/^#\s/.test(line)) {
      errors.push(`${file}: use ## or ### in the post body; the template adds the H1 from the title`);
      i++;
    } else if (/^---\s*$/.test(line)) {
      out.push("<hr>"); i++;
    } else if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, "")); i++; }
      out.push(`<ul>\n${items.map((t) => `  <li>${inline(t)}</li>`).join("\n")}\n</ul>`);
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, "")); i++; }
      out.push(`<ol>\n${items.map((t) => `  <li>${inline(t)}</li>`).join("\n")}\n</ol>`);
    } else if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>\n${buf.join("\n").split(/\n{2,}/).map((p) => `  <p>${inline(p.replace(/\n/g, " "))}</p>`).join("\n")}\n</blockquote>`);
    } else if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(/^\|?\s*:?-{3,}/.test(rows[1] || "") ? 2 : 1).map(cells);
      out.push(`<div class="table-wrap"><table>\n  <thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>\n  <tbody>\n${body.map((r) => `    <tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("\n")}\n  </tbody>\n</table></div>`);
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { buf.push(lines[i].trim()); i++; }
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
  }
  return { html: out.join("\n"), toc };
}

// ---------------------------------------------------------------------------
// Load and check posts
// ---------------------------------------------------------------------------
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const posts = [];
  const seen = new Set();
  for (const file of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md")).sort()) {
    const rel = `content/posts/${file}`;
    const fm = parseFrontMatter(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"), rel);
    if (!fm) continue;
    const p = fm.data;
    for (const k of REQUIRED) if (p[k] === undefined || p[k] === "" || (Array.isArray(p[k]) && !p[k].length)) errors.push(`${rel}: front matter "${k}" is missing`);
    if (errors.length) continue;
    if (!Array.isArray(p.tags)) p.tags = [p.tags];

    const fileMatch = file.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/);
    if (!fileMatch) errors.push(`${rel}: file name must be YYYY-MM-DD-slug.md`);
    else {
      if (fileMatch[1] !== p.date) errors.push(`${rel}: date "${p.date}" does not match the file name`);
      if (fileMatch[2] !== p.slug) errors.push(`${rel}: slug "${p.slug}" does not match the file name`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || isNaN(Date.parse(p.date))) errors.push(`${rel}: date must be YYYY-MM-DD`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) errors.push(`${rel}: slug must be lowercase words joined by hyphens`);
    if (seen.has(p.slug)) errors.push(`${rel}: slug "${p.slug}" is used twice`);
    seen.add(p.slug);
    if (p.description.length > 155) errors.push(`${rel}: description is ${p.description.length} characters (max 155)`);
    if (p.author !== "Sam Adebayo") errors.push(`${rel}: author must be "Sam Adebayo"`);

    const fullText = `${p.title}\n${p.description}\n${fm.body}`;
    if (/—/.test(fullText)) errors.push(`${rel}: contains an em dash (BLOG-RULES: don't use em dashes)`);
    const banned = fullText.match(BANNED);
    if (banned) errors.push(`${rel}: contains "${banned[0]}" (BLOG-RULES: solar and home energy only)`);
    if (/\[(CONFIRM|TODO)/i.test(fullText) || /\bTODO\b|XX%/.test(fullText)) errors.push(`${rel}: contains a placeholder ([CONFIRM], TODO or XX%)`);

    const { html, toc } = markdown(fm.body, rel);
    const plain = fm.body.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#>*`|_-]/g, " ");
    const words = plain.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    if (words < 900 || words > 1400) warnings.push(`${rel}: ${words} words (BLOG-RULES: 900 to 1,400)`);
    const links = [...fm.body.matchAll(/\]\(([^)\s]+)\)/g)].map((x) => x[1]);
    const internal = links.filter((u) => INTERNAL_TARGETS.test(u));
    const external = links.filter((u) => /^https?:\/\//.test(u) && !u.startsWith(SITE));
    if (internal.length < 2) warnings.push(`${rel}: ${internal.length} internal links to /solar, /pricing, /case-studies or a post (need at least 2)`);
    if (external.length < 1 || external.length > 2) warnings.push(`${rel}: ${external.length} outside links (BLOG-RULES: 1 to 2)`);
    for (const u of links.filter((x) => x.startsWith("/"))) {
      const target = u.split("#")[0].replace(/\/$/, "") || "/";
      const exists = target === "/" || [target.slice(1), `${target.slice(1)}.html`, `${target.slice(1)}/index.html`].some((c) => fs.existsSync(path.join(ROOT, c)));
      const isPost = /^\/blog\/[a-z0-9-]+$/.test(target) && fs.readdirSync(POSTS_DIR).some((f) => f.endsWith(`-${target.slice(6)}.md`));
      if (!exists && !isPost) errors.push(`${rel}: internal link ${u} goes nowhere`);
    }
    if (p.search_phrase) {
      const sp = p.search_phrase.toLowerCase();
      const firstPara = (fm.body.split(/\n\s*\n/).find((b) => b.trim() && !/^#/.test(b.trim())) || "").toLowerCase();
      for (const [where, text] of [["title", p.title], ["description", p.description], ["first paragraph", firstPara]]) {
        if (!text.toLowerCase().includes(sp)) warnings.push(`${rel}: search phrase "${p.search_phrase}" is not in the ${where}`);
      }
    }
    const computed = Math.max(1, Math.round(words / 230));
    posts.push({ ...p, file: rel, html, toc, words, computedReadingTime: computed });
  }
  return posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
}

// ---------------------------------------------------------------------------
// Site chrome copied from case-studies.html
// ---------------------------------------------------------------------------
function chrome() {
  const src = read("case-studies.html").replace(/\r\n/g, "\n");
  const pick = (re, name) => { const m = src.match(re); if (!m) throw new Error(`case-studies.html: could not find the ${name}`); return m[0]; };
  return {
    headAssets: pick(/  <!-- Typography: Inter font preconnect -->[\s\S]*?<link rel="stylesheet" href="\/assets\/styles\.css">/, "head assets"),
    header: pick(/<body[\s\S]*?<\/header>\n/, "header"),
    book: pick(/    <!-- =+\n         9\. FINAL CTA SECTION[\s\S]*?<section id="book"[\s\S]*?\n    <\/section>\n/, "booking section"),
    footer: pick(/\n  <!-- =+\n       FOOTER[\s\S]*$/, "footer"),
  };
}

function head({ title, description, url, type, jsonld, published }) {
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Generated by scripts/build-blog.js. Edit the Markdown in content/posts, not this file. -->
  <title>${escHtml(title)}</title>
  <meta name="title" content="${escHtml(title)}">
  <meta name="description" content="${escHtml(description)}">
  <meta name="author" content="Sam Adebayo">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="application/rss+xml" title="Thrivebuild blog" href="${SITE}/blog/rss.xml">
  <meta name="theme-color" content="#C2410C">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:image" content="${THUMB}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="627">
  <meta property="og:image:alt" content="Thrivebuild: more signed installs from the leads you already have.">${published ? `
  <meta property="article:published_time" content="${published}">
  <meta property="article:author" content="Sam Adebayo">` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${THUMB}">

  <!-- Favicons -->
  <link rel="icon" type="image/png" href="/assets/img/logo-mark.png">
  <link rel="apple-touch-icon" href="/assets/img/logo-mark.png">

  <!-- Structured Data -->
  <script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
  </script>

${CHROME.headAssets}
</head>
`;
}

const tagPills = (tags, dark) => tags.map((t) => `<span class="inline-flex px-2.5 py-1 rounded-full ${dark ? "bg-orange-500/15 text-orange-300" : "bg-brand-tint border border-orange-200 text-brand"} text-[11px] font-semibold tracking-wide uppercase">${escHtml(t)}</span>`).join(" ");

function postCard(p) {
  return `
          <article class="group rounded-2xl border border-line bg-surface p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex flex-col">
            <div class="flex flex-wrap gap-2 mb-4">${tagPills(p.tags)}</div>
            <h3 class="text-lg font-bold text-ink leading-snug mb-2">
              <a href="/blog/${p.slug}" class="hover:text-brand transition-colors">${escHtml(p.title)}</a>
            </h3>
            <p class="text-sm text-body leading-relaxed mb-5">${escHtml(p.description)}</p>
            <p class="mt-auto text-xs text-body"><time datetime="${p.date}">${niceDate(p.date)}</time> · ${escHtml(p.reading_time)}</p>
          </article>`;
}

const ORG = { "@type": "Organization", "@id": `${SITE}/#organization`, name: "Thrivebuild", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/assets/img/logo-mark.png` } };
const PERSON = { "@type": "Person", "@id": `${SITE}/about#sam`, name: "Sam Adebayo", jobTitle: "Founder of Thrivebuild", url: `${SITE}/about` };

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
function renderPost(p, all) {
  const url = `${SITE}/blog/${p.slug}`;
  const sameTag = all.filter((o) => o.slug !== p.slug && o.tags.some((t) => p.tags.includes(t)));
  const others = all.filter((o) => o.slug !== p.slug && !sameTag.includes(o));
  const related = [...sameTag, ...others].slice(0, 3);
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        headline: p.title,
        description: p.description,
        image: [THUMB],
        datePublished: p.date,
        dateModified: p.updated || p.date,
        author: PERSON,
        publisher: ORG,
        mainEntityOfPage: url,
        keywords: p.tags.join(", "),
        wordCount: p.words,
        inLanguage: "en",
      },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE}/blog` },
        { "@type": "ListItem", position: 2, name: p.title, item: url },
      ] },
    ],
  };
  return head({ title: `${p.title} | Thrivebuild`, description: p.description, url, type: "article", jsonld, published: p.date }) + CHROME.header + `
  <main id="main">

    <article class="pt-8 pb-12 md:pt-10 md:pb-16 bg-radial-glow" aria-labelledby="post-title">
      <div class="max-w-3xl mx-auto px-5 sm:px-8">
        <nav aria-label="Breadcrumb" class="mb-8">
          <ol class="flex flex-wrap items-center gap-2 text-sm text-body">
            <li><a href="/blog" class="hover:text-brand font-medium">Blog</a></li>
            <li aria-hidden="true" class="text-slate-300">›</li>
            <li aria-current="page" class="text-ink font-medium">${escHtml(p.title)}</li>
          </ol>
        </nav>

        <div class="mb-10">
          <div class="flex flex-wrap gap-2 mb-5">${tagPills(p.tags)}</div>
          <h1 id="post-title" class="text-3xl sm:text-4xl lg:text-[44px] font-bold text-ink tracking-tight leading-[1.15] mb-5" style="text-wrap: balance;">${escHtml(p.title)}</h1>
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-body">
            <time datetime="${p.date}">${niceDate(p.date)}</time>
            <span class="text-slate-300" aria-hidden="true">·</span>
            <span>${escHtml(p.reading_time)}</span>
          </p>
          <p class="mt-3 text-sm text-body">By <a href="/about" class="font-semibold text-ink hover:text-brand">${AUTHOR_LINE}</a></p>
        </div>

        <div class="post-body">
${p.html.split("\n").map((l) => `          ${l}`).join("\n")}
        </div>

        <!-- End-of-post CTA -->
        <aside class="mt-14 rounded-2xl bg-surface-dark text-white p-7 sm:p-10 relative overflow-hidden bg-radial-dark-glow" aria-labelledby="post-cta-heading">
          <h2 id="post-cta-heading" class="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Want to see where your deals are leaking?</h2>
          <p class="text-base text-slate-300 leading-relaxed mb-6 max-w-xl">Book a free 20-minute Workflow Map call. We look at how your leads, quotes and installs move today and show you where deals get lost.</p>
          <a href="#book"
            class="inline-flex items-center justify-center px-6 py-3.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-base font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
            Book a 20-Min Workflow Map
          </a>
        </aside>
      </div>
    </article>
${related.length ? `
    <section class="py-14 md:py-16 bg-surface-alt border-y border-line" aria-labelledby="related-heading">
      <div class="max-w-6xl mx-auto px-5 sm:px-8">
        <h2 id="related-heading" class="text-xl sm:text-2xl font-bold text-ink tracking-tight mb-6">Related posts</h2>
        <div class="grid md:grid-cols-3 gap-6">${related.map(postCard).join("")}
        </div>
      </div>
    </section>
` : ""}
${CHROME.book}
  </main>
` + CHROME.footer;
}

function renderIndex(posts) {
  const url = `${SITE}/blog`;
  const desc = "Practical guides for owners of solar and home energy companies: faster lead follow-up, cleaner handoffs and getting paid on every install.";
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${url}#blog`,
        url,
        name: "Thrivebuild blog",
        description: desc,
        publisher: ORG,
        blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.date, author: PERSON })),
      },
    ],
  };
  const list = posts.map((p) => `
          <article class="py-8 first:pt-0 border-b border-line last:border-0">
            <p class="text-sm text-body mb-2"><time datetime="${p.date}">${niceDate(p.date)}</time> · ${escHtml(p.reading_time)}</p>
            <h2 class="text-xl sm:text-2xl font-bold text-ink tracking-tight leading-snug mb-3">
              <a href="/blog/${p.slug}" class="hover:text-brand transition-colors">${escHtml(p.title)}</a>
            </h2>
            <p class="text-base text-body leading-relaxed mb-4">${escHtml(p.description)}</p>
            <div class="flex flex-wrap items-center gap-2">${tagPills(p.tags)}
              <a href="/blog/${p.slug}" class="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover">Read post <span aria-hidden="true">→</span></a>
            </div>
          </article>`).join("");
  return head({ title: "Blog | Thrivebuild", description: desc, url, type: "website", jsonld }) + CHROME.header + `
  <main id="main">

    <section class="relative overflow-hidden bg-radial-glow py-16 md:py-20" aria-labelledby="blog-heading">
      <div class="max-w-3xl mx-auto px-5 sm:px-8">
        <p class="inline-flex items-center px-3.5 py-1.5 rounded-full bg-brand-tint border border-orange-200 text-xs sm:text-[13px] font-semibold text-brand tracking-wide mb-6">Blog</p>
        <h1 id="blog-heading" class="text-3xl sm:text-4xl lg:text-[48px] font-bold text-ink tracking-tight leading-[1.1] mb-5" style="text-wrap: balance;">
          Notes for solar and home energy company owners.
        </h1>
        <p class="text-base sm:text-lg text-body leading-relaxed">${desc.replace("Practical guides for owners of solar and home energy companies: ", "Practical guides on ")}</p>
        <p class="mt-4 text-sm"><a href="/blog/rss.xml" class="font-semibold text-brand hover:text-brand-hover">RSS feed</a></p>
      </div>
    </section>

    <section class="pb-16 md:pb-24 bg-surface" aria-label="All posts">
      <div class="max-w-3xl mx-auto px-5 sm:px-8">${posts.length ? list : `
        <p class="text-base text-body">No posts yet.</p>`}
      </div>
    </section>
${CHROME.book}
  </main>
` + CHROME.footer;
}

function renderLatest(posts) {
  if (!posts.length) return "";
  const latest = posts.slice(0, 3);
  return `
    <!-- ==========================================================================
         LATEST FROM THE BLOG (generated by scripts/build-blog.js)
         ========================================================================== -->
    <section id="blog-latest" class="py-16 md:py-24 bg-surface-alt border-t border-line" aria-labelledby="blog-latest-heading">
      <div class="max-w-6xl mx-auto px-5 sm:px-8">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p class="text-xs font-semibold text-brand tracking-wider uppercase mb-2">Blog</p>
            <h2 id="blog-latest-heading" class="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink tracking-tight">Latest from the blog</h2>
          </div>
          <a href="/blog" class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-hover">All posts <span aria-hidden="true">→</span></a>
        </div>
        <div class="grid md:grid-cols-3 gap-6">${latest.map(postCard).join("")}
        </div>
      </div>
    </section>
`;
}

function renderRss(posts) {
  const items = posts.map((p) => `
    <item>
      <title>${escXml(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${escXml(p.description)}</description>
      <author>sam@thrivebuild.co (Sam Adebayo)</author>
${p.tags.map((t) => `      <category>${escXml(t)}</category>`).join("\n")}
    </item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Thrivebuild blog</title>
    <link>${SITE}/blog</link>
    <description>Practical guides for owners of solar and home energy companies.</description>
    <language>en</language>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>${posts.length ? `
    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>` : ""}${items}
  </channel>
</rss>
`;
}

// Replace the text between two marker comments, keeping the markers
function between(file, startRe, endMarker, inner) {
  const full = path.join(ROOT, file);
  const text = fs.readFileSync(full, "utf8");
  const nl = eol(text);
  const s = text.search(startRe);
  const e = text.indexOf(endMarker);
  if (s < 0 || e < 0 || e < s) { errors.push(`${file}: blog markers not found`); return; }
  const startLineEnd = text.indexOf("\n", s) + 1;
  const lineStart = text.lastIndexOf("\n", e) + 1;
  const updated = text.slice(0, startLineEnd) + inner.replace(/\r?\n/g, nl) + text.slice(lineStart);
  if (updated !== text) fs.writeFileSync(full, updated);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const CHROME = chrome();
const posts = loadPosts();
if (errors.length) {
  console.error("Blog build stopped:\n  " + errors.join("\n  "));
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const keep = new Set(["index.html", "rss.xml", ...posts.map((p) => `${p.slug}.html`)]);
for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith(".html") && !keep.has(f)) fs.unlinkSync(path.join(OUT_DIR, f)); // drop pages for deleted posts
for (const p of posts) fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.html`), renderPost(p, posts));
fs.writeFileSync(path.join(OUT_DIR, "index.html"), renderIndex(posts));
fs.writeFileSync(path.join(OUT_DIR, "rss.xml"), renderRss(posts));

const sitemapEntries = [{ loc: `${SITE}/blog`, lastmod: posts[0] ? posts[0].date : null }, ...posts.map((p) => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.updated || p.date }))]
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}\n  </url>\n`).join("");
between("sitemap.xml", /<!-- blog:start/, "<!-- blog:end -->", sitemapEntries);
between("index.html", /<!-- blog-latest:start/, "<!-- blog-latest:end -->", renderLatest(posts));

if (errors.length) { console.error("Blog build stopped:\n  " + errors.join("\n  ")); process.exit(1); }
console.log(`Blog built: ${posts.length} post${posts.length === 1 ? "" : "s"}`);
for (const p of posts) console.log(`  /blog/${p.slug}  (${p.date}, ${p.words} words, reading_time "${p.reading_time}", about ${p.computedReadingTime} min by word count)`);
if (warnings.length) console.log("Warnings (BLOG-RULES):\n  " + warnings.join("\n  "));
else console.log("No rule warnings.");
