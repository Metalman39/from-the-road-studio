import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const feed = JSON.parse(fs.readFileSync(path.join(cwd, "blog-feed.json"), "utf8"));
const postsDir = path.join(cwd, "posts");
const monthsDir = path.join(cwd, "months");

fs.mkdirSync(postsDir, { recursive: true });
fs.mkdirSync(monthsDir, { recursive: true });

const entries = feed.feed.entry ?? [];

const entityMap = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const decodeEntities = (value = "") =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replace(/&([a-z]+);/gi, (_, name) => entityMap[name] ?? `&${name};`);

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getAlternateUrl = (entry) =>
  entry.link.find((link) => link.rel === "alternate" && link.type === "text/html")?.href ?? "";

const slugFromUrl = (url) => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts.join("-").replace(/\.html$/, "") || "post";
};

const formatDate = (published) => {
  const [yyyy, mm, dd] = published.slice(0, 10).split("-");
  return `${yyyy}.${mm}.${dd}`;
};

const archiveKey = (published) => {
  const [yyyy, mm] = published.slice(0, 10).split("-");
  return `${yyyy}.${mm}`;
};

const extractImages = (html) => {
  const images = [];
  const regex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(html))) {
    const src = decodeEntities(match[1]);
    if (!images.includes(src)) {
      images.push(src);
    }
  }

  return images;
};

const extractLinks = (html) => {
  const links = [];
  const regex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html))) {
    if (/<img\b/i.test(match[2])) {
      continue;
    }

    const href = decodeEntities(match[1]);
    const label = htmlToText(match[2]).trim();

    if (href && label && !links.some((link) => link.href === href && link.label === label)) {
      links.push({ href, label });
    }
  }

  return links;
};

const htmlToText = (html) =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|blockquote|li|h[1-6])>/gi, "\n")
      .replace(/<img\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const buildParagraphs = (text) =>
  text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n");

const extractFontFamily = (html) => {
  const match = html.match(/font-family:\s*([^;"']+)/i);
  return match ? decodeEntities(match[1]).trim() : "";
};

const fontHead = (fontFamily) => {
  if (fontFamily !== "WDXL Lubrifont JP N") {
    return "";
  }

  return `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=WDXL+Lubrifont+JP+N&display=swap" rel="stylesheet">`;
};

const layout = ({ title, body, root = ".", fontFamily = "" }) => `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} - From the Road &amp; Studio</title>
    ${fontHead(fontFamily)}
    <link rel="stylesheet" href="${root}/styles.css">
  </head>
  <body>
    <main class="shell">
      <section class="terminal">
        <div class="terminal__bar">
          <span>TAKA-N88 BASIC V2.6</span>
          <span>BLOG ARCHIVE MODE</span>
        </div>
        ${body}
        <footer class="footer">
          <span>READY.</span>
          <span class="cursor" aria-hidden="true"></span>
        </footer>
      </section>
    </main>
  </body>
</html>
`;

const posts = entries.map((entry) => {
  const sourceUrl = getAlternateUrl(entry);
  const slug = slugFromUrl(sourceUrl);
  const title = entry.title.$t;
  const published = entry.published.$t;
  const date = formatDate(published);
  const month = archiveKey(published);
  const rawContent = entry.content?.$t ?? "";
  const images = extractImages(rawContent);
  const links = extractLinks(rawContent);
  const text = htmlToText(rawContent);
  const fontFamily = slug === "2026-05-4" ? extractFontFamily(rawContent) : "";

  return {
    slug,
    title,
    date,
    month,
    sourceUrl,
    images,
    links,
    fontFamily,
    excerpt: text.slice(0, 96),
    body: buildParagraphs(text),
  };
});

for (const post of posts) {
  const imageBlock = post.images.length
    ? `<div class="post-gallery">${post.images
        .map((src, index) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(post.title)} photo ${index + 1}" loading="lazy">`)
        .join("\n")}</div>`
    : `<p class="status-line">NO PHOTO DATA</p>`;

  const linksBlock = post.links.length
    ? `<div class="post-links"><div class="panel__title">LINKS IN POST</div>${post.links
        .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
        .join("\n")}</div>`
    : "";

  const body = `
        <nav class="nav nav--compact" aria-label="Blog navigation">
          <a href="../index.html">[HOME]</a>
          <a href="../blog.html">[BLOG]</a>
          <a href="${escapeHtml(post.sourceUrl)}">[ORIGINAL]</a>
        </nav>
        <article class="panel blog-post"${post.fontFamily ? ` data-post-font style="--post-font-family: '${escapeHtml(post.fontFamily)}', 'MS Gothic', monospace;"` : ""}>
          <p class="prompt">OPEN "${escapeHtml(post.slug.toUpperCase())}"</p>
          <time datetime="${post.date.replaceAll(".", "-")}">${post.date}</time>
          <h1>${escapeHtml(post.title)}</h1>
          <div class="post-body-retro">
            ${post.body}
          </div>
          ${imageBlock}
          ${linksBlock}
        </article>`;

  fs.writeFileSync(path.join(postsDir, `${post.slug}.html`), layout({ title: post.title, body, root: "..", fontFamily: post.fontFamily }));
}

const byMonth = new Map();
for (const post of posts) {
  if (!byMonth.has(post.month)) {
    byMonth.set(post.month, []);
  }
  byMonth.get(post.month).push(post);
}

for (const [month, monthPosts] of byMonth.entries()) {
  const monthBody = `
        <header class="hero hero--small">
          <p class="prompt">OPEN /BLOG/${month.replace(".", "-")}</p>
          <h1>${month}</h1>
          <p class="tagline">${monthPosts.length} posts in CRT archive mode.</p>
        </header>
        <nav class="nav nav--compact" aria-label="Blog navigation">
          <a href="../index.html">[HOME]</a>
          <a href="../blog.html">[ARCHIVE]</a>
        </nav>
        <section class="month-post-grid">
          ${monthPosts
            .map(
              (post) => `
          <a class="month-post-card" href="../posts/${post.slug}.html">
            ${post.images[0] ? `<img src="${escapeHtml(post.images[0])}" alt="${escapeHtml(post.title)}" loading="lazy">` : `<span class="month-post-card__noimage">NO IMG</span>`}
            <span>
              <time>${post.date}</time>
              <strong>${escapeHtml(post.title)}</strong>
            </span>
          </a>`
            )
            .join("\n")}
        </section>`;

  fs.writeFileSync(
    path.join(monthsDir, `${month.replace(".", "-")}.html`),
    layout({ title: `${month} Blog`, body: monthBody, root: ".." })
  );
}

const archiveBody = `
        <header class="hero hero--small">
          <p class="prompt">DIR /BLOG /ARCHIVE</p>
          <h1>Blog Archive</h1>
          <p class="tagline">Select a month to inspect posts, titles, and photos.</p>
        </header>
        <nav class="nav nav--compact" aria-label="Blog navigation">
          <a href="index.html">[HOME]</a>
          <a href="#archive">[ARCHIVE]</a>
        </nav>
        <section class="month-list" id="archive">
          ${[...byMonth.entries()]
            .map(
              ([month, monthPosts]) => `
          <a class="panel month-card" href="months/${month.replace(".", "-")}.html">
            <span class="month-card__code">LOAD "${month.replace(".", "-")}"</span>
            <strong>${month}</strong>
            <span>${monthPosts.length} POSTS</span>
          </a>`
            )
            .join("\n")}
        </section>`;

fs.writeFileSync(path.join(cwd, "blog.html"), layout({ title: "Blog Archive", body: archiveBody }));

console.log(`Generated ${posts.length} posts, ${byMonth.size} month pages, and blog.html`);
