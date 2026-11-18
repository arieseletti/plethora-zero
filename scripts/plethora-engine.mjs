/**
 * PLETHORA // ZERO — Daily SEO & GEO Content Engine
 * Uses OpenAI API to publish long-tail, schema-rich buying guides & household articles,
 * rebuilds sitemap.xml / robots.txt / articles archive, and pings IndexNow.
 */

import fs from 'fs';
import path from 'path';

const ARTICLES_PER_RUN = 4; // Safe-max starting pace (120/mo). Bump to 6-8 once Google indexes steadily.
const SITE_URL = 'https://theworldhasplenty.org';
const AMAZON_TAG = 'preferredoutc-20';
const EBAY_LINK = 'https://ebay.us/Gy9KfL';
const ALI_LINK = 'https://s.click.aliexpress.com/e/_c4Ptg7xH';
const INDEXNOW_KEY = 'f4b8c9d2e7a143c69b2d8e5f1a3c7b90';

const ROOT_DIR = process.cwd();
const ARTICLES_DIR = path.join(ROOT_DIR, 'articles');
const MANIFEST_PATH = path.join(ARTICLES_DIR, 'articles.json');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

const PILLARS = [
  'AmazonSmile alternatives and zero-cost everyday giving habits',
  'Monthly household restock checklists and bulk-buying math (paper goods, cleaning, laundry, pantry)',
  'Budget-friendly everyday essentials and high-value swaps for tight months',
  'Daily supplements, vitamins, electrolytes, and pantry staples buying guides',
  'Certified refurbished electronics, laptops, headphones, and small appliances on eBay',
  'Practical home organization, energy-saving lighting, cables, and travel gear on AliExpress & Amazon',
  'Seasonal prep guides (winter home prep, back-to-school, holiday gifting on a budget, spring reset)',
  'Smart grocery, coffee, and kitchen staple buying guides that cut monthly bills'
];

async function callOpenAI(messages, jsonMode = true) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.75,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 75);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function generateTopicBatch(existingSlugs, count) {
  const recentSlugs = existingSlugs.slice(0, 60).join(', ') || 'none yet';
  const raw = await callOpenAI([
    {
      role: 'system',
      content: 'You are an SEO and Generative Engine Optimization (GEO) strategist. Return strictly valid JSON.'
    },
    {
      role: 'user',
      content: `Generate ${count} distinct, high-intent long-tail search article topics for PLETHORA // ZERO (a portal where normal Amazon, eBay, and AliExpress shopping redirects built-in retail commissions to $250 household micro-grants at $0 extra cost).

Draw across these content pillars:
${PILLARS.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Rules:
- Target natural, specific long-tail queries people actually type into Google, Perplexity, or ChatGPT (e.g., "best bulk household essentials to buy online to save money", "is certified refurbished worth it on ebay for laptops", "amazon smile replacement that actually works in 2026").
- Do NOT duplicate or closely overlap any of these existing slugs: ${recentSlugs}
- Assign each topic the most natural primary retailer: "amazon", "ebay", or "aliexpress".

Return JSON in this exact format:
{
  "topics": [
    {
      "title": "Compelling, natural SEO title (55-68 chars)",
      "slug": "clean-url-slug",
      "category": "Short 2-word category",
      "keyword": "primary long-tail search query",
      "store": "amazon | ebay | aliexpress",
      "searchQuery": "short 2-4 word product search term for that store"
    }
  ]
}`
    }
  ]);

  const parsed = JSON.parse(raw);
  return parsed.topics || [];
}

async function generateArticleContent(topic) {
  const storeUrl =
    topic.store === 'ebay'
      ? EBAY_LINK
      : topic.store === 'aliexpress'
      ? ALI_LINK
      : `https://www.amazon.com/s?k=${encodeURIComponent(topic.searchQuery || topic.keyword)}&tag=${AMAZON_TAG}`;

  const storeLabel =
    topic.store === 'ebay' ? 'eBay' : topic.store === 'aliexpress' ? 'AliExpress' : 'Amazon';

  const raw = await callOpenAI([
    {
      role: 'system',
      content: `You are an editorial writer for PLETHORA // ZERO (#theworldhasplenty). Write genuinely useful, practical, grounded buying guides and household notes in a calm, trustworthy, non-salesy tone. Optimize for both SEO and GEO (clear direct answers, scannable H2/H3 sections, a practical comparison or checklist table, and concise FAQ answers). Never sound like spam or hype. Return strictly valid JSON.`
    },
    {
      role: 'user',
      content: `Write a comprehensive 1,000-1,300 word article for:
Title: ${topic.title}
Primary Search Query: ${topic.keyword}
Category: ${topic.category}
Primary Store: ${storeLabel}
Store URL (use naturally ONLY 2 times inside bodyHtml as clean contextual <a href="${storeUrl}" target="_blank" rel="noopener sponsored"> links—never stuff links): ${storeUrl}

Requirements:
1. "metaDescription": 140-158 character summary optimized for search snippets.
2. "summary": 1-2 sentence clean card summary for the Journal page.
3. "directAnswer": A crisp 2-3 sentence TL;DR answer at the top (great for Google AI Overviews and Perplexity citations).
4. "bodyHtml": Clean semantic HTML using <h2>, <h3>, <p>, <ul>/<li>, and at least one clean <table> comparing options, specs, or cost-per-use. Include practical advice, real-world buying criteria, and one natural section explaining how starting this exact ${storeLabel} session through PLETHORA // ZERO redirects the built-in retail commission to $250 household relief micro-grants at $0 extra cost.
5. "faqs": Array of 4 realistic Q&A objects ({"q": "...", "a": "..."}) answering natural follow-up search queries.

Return JSON in this exact format:
{
  "metaDescription": "...",
  "summary": "...",
  "directAnswer": "...",
  "bodyHtml": "<h2>...</h2>...",
  "faqs": [{"q": "...", "a": "..."}]
}`
    }
  ]);

  return {
    ...JSON.parse(raw),
    storeUrl,
    storeLabel
  };
}

function renderArticleHtml(meta, content) {
  const canonical = `${SITE_URL}/articles/${meta.slug}.html`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: content.metaDescription,
    datePublished: meta.date,
    dateModified: meta.date,
    author: { '@type': 'Organization', name: 'PLETHORA // ZERO' },
    publisher: { '@type': 'Organization', name: 'PLETHORA // ZERO', url: SITE_URL },
    mainEntityOfPage: canonical
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (content.faqs || []).map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const faqHtml = (content.faqs || [])
    .map(
      f => `<div class="faq-item"><h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p></div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)} — PLETHORA // ZERO</title>
  <meta name="description" content="${escapeHtml(content.metaDescription)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(content.metaDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:wght@500;600&display=swap" rel="stylesheet">
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <style>
    :root { --bg:#FAF9F6; --pink:#c106d5; --pink-dark:#9604a6; --pink-soft:#fdf2ff; --pink-border:#f3c6f8; --ink:#0f172a; --body:#334155; --muted:#64748b; --line:#e2e8f0; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:var(--bg); color:var(--ink); font-family:'Inter',-apple-system,sans-serif; line-height:1.72; -webkit-font-smoothing:antialiased; }
    .serif { font-family:'Newsreader',Georgia,serif; }
    .wrap { max-width:760px; margin:0 auto; padding:36px 20px 80px; }
    .nav { display:flex; justify-content:space-between; align-items:center; padding-bottom:18px; border-bottom:1px solid var(--line); margin-bottom:32px; gap:12px; flex-wrap:wrap; }
    .nav a { text-decoration:none; font-size:13.5px; font-weight:700; color:var(--pink); }
    .brand { font-weight:900; letter-spacing:0.12em; color:var(--ink) !important; font-size:15px !important; }
    .brand span { color:var(--pink); }
    .eyebrow { display:inline-block; background:var(--pink-soft); color:var(--pink); border:1px solid var(--pink-border); padding:4px 12px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:14px; }
    h1 { font-size:clamp(28px,5vw,42px); line-height:1.18; font-weight:600; margin-bottom:14px; }
    .meta { font-size:13px; color:var(--muted); margin-bottom:24px; }
    .tldr { background:#fff; border-left:4px solid var(--pink); border-radius:10px; padding:18px 20px; margin-bottom:28px; font-size:15.5px; color:var(--body); box-shadow:0 4px 16px rgba(15,23,42,0.04); }
    .tldr strong { color:var(--ink); display:block; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; color:var(--pink); }
    article h2 { font-family:'Newsreader',Georgia,serif; font-size:26px; margin:34px 0 12px; color:var(--ink); line-height:1.25; }
    article h3 { font-size:18px; margin:24px 0 8px; color:var(--ink); }
    article p { margin-bottom:16px; color:var(--body); font-size:16.5px; }
    article ul, article ol { margin:0 0 18px 22px; color:var(--body); font-size:16px; }
    article li { margin-bottom:8px; }
    article a { color:var(--pink); font-weight:600; text-decoration:underline; text-underline-offset:3px; }
    table { width:100%; border-collapse:collapse; margin:24px 0; background:#fff; border-radius:10px; overflow:hidden; border:1px solid var(--line); font-size:14.5px; }
    th, td { padding:12px 14px; text-align:left; border-bottom:1px solid var(--line); }
    th { background:#f8fafc; font-weight:700; color:var(--ink); }
    .faq-box { margin-top:40px; padding-top:28px; border-top:1px solid var(--line); }
    .faq-item { margin-bottom:20px; }
    .faq-item h3 { font-size:16.5px; margin-bottom:6px; color:var(--ink); }
    .faq-item p { font-size:15px; color:var(--body); }
    .cta-box { margin-top:40px; padding:26px; background:var(--pink-soft); border:1px solid var(--pink-border); border-radius:14px; text-align:center; }
    .cta-box h3 { font-size:22px; margin-bottom:8px; }
    .cta-box p { font-size:14.5px; color:var(--body); margin-bottom:18px; }
    .btn { display:inline-block; padding:13px 22px; background:var(--pink); color:#fff !important; text-decoration:none !important; border-radius:10px; font-weight:800; font-size:14.5px; margin:4px; }
    .btn:hover { background:var(--pink-dark); }
    .btn.dark { background:var(--ink); }
    footer { margin-top:52px; padding-top:20px; border-top:1px solid var(--line); font-size:12.5px; color:var(--muted); }
    .disclosure { margin-bottom:10px; font-size:12px; color:var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <nav class="nav">
      <a href="/" class="brand">PLETHORA <span>//</span> ZERO</a>
      <div>
        <a href="/articles/" style="margin-right:16px;color:var(--muted);">All Journal Articles</a>
        <a href="/">Shop with ZERO &rarr;</a>
      </div>
    </nav>

    <span class="eyebrow">${escapeHtml(meta.category)}</span>
    <h1 class="serif">${escapeHtml(meta.title)}</h1>
    <div class="meta">Published ${escapeHtml(meta.date)} &bull; PLETHORA // ZERO (#theworldhasplenty)</div>

    <div class="tldr">
      <strong>Quick Summary</strong>
      ${escapeHtml(content.directAnswer)}
    </div>

    <article>
      ${content.bodyHtml}
    </article>

    <section class="faq-box">
      <h2 class="serif" style="font-size:26px;margin-bottom:18px;">Frequently Asked Questions</h2>
      ${faqHtml}
    </section>

    <div class="cta-box">
      <h3 class="serif">About to shop? Tap ZERO first.</h3>
      <p>Start your normal ${escapeHtml(content.storeLabel)} order through ZERO. Your price stays identical, and the built-in retail commission funds $250 household relief micro-grants.</p>
      <a href="${content.storeUrl}" target="_blank" rel="noopener sponsored" class="btn">Shop ${escapeHtml(content.storeLabel)} via ZERO &rarr;</a>
      <a href="/" class="btn dark">Open ZERO Portal</a>
    </div>

    <footer>
      <p class="disclosure">Affiliate Disclosure: As an Amazon Associate and eBay/AliExpress partner, PLETHORA // ZERO earns standard commissions from qualifying purchases at $0.00 extra cost to you. Those commissions fund our community micro-grant pool.</p>
      <p>&copy; ${new Date().getFullYear()} PLETHORA // ZERO (#theworldhasplenty). All rights reserved.</p>
    </footer>
  </div>
</body>
</html>`;
}

function renderArchiveHtml(articles) {
  const cards = articles
    .map(
      a => `
      <article class="card">
        <div class="meta">${escapeHtml(a.category)} &bull; ${escapeHtml(a.date)}</div>
        <h2><a href="/articles/${a.slug}.html">${escapeHtml(a.title)}</a></h2>
        <p>${escapeHtml(a.summary)}</p>
        <a class="read" href="/articles/${a.slug}.html">Read full guide &rarr;</a>
      </article>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Journal Archive — PLETHORA // ZERO</title>
  <meta name="description" content="Practical buying guides, household restock checklists, and everyday savings notes from PLETHORA // ZERO (#theworldhasplenty).">
  <link rel="canonical" href="${SITE_URL}/articles/">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Newsreader:wght@600&display=swap" rel="stylesheet">
  <style>
    body { background:#FAF9F6; color:#0f172a; font-family:'Inter',sans-serif; margin:0; padding:36px 20px 80px; }
    .wrap { max-width:960px; margin:0 auto; }
    .top { display:flex; justify-content:space-between; align-items:center; padding-bottom:18px; border-bottom:1px solid #e2e8f0; margin-bottom:32px; }
    .top a { text-decoration:none; font-weight:800; color:#c106d5; font-size:14px; }
    h1 { font-family:'Newsreader',Georgia,serif; font-size:38px; margin:0 0 10px; }
    .sub { color:#475569; margin:0 0 32px; font-size:16px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:18px; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:22px; display:flex; flex-direction:column; justify-content:space-between; }
    .meta { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; color:#c106d5; margin-bottom:8px; }
    .card h2 { font-size:18px; line-height:1.3; margin:0 0 10px; }
    .card h2 a { color:#0f172a; text-decoration:none; }
    .card p { font-size:14px; color:#475569; margin:0 0 14px; line-height:1.55; }
    .read { font-size:13.5px; font-weight:700; color:#c106d5; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <a href="/" style="color:#0f172a;letter-spacing:0.12em;">PLETHORA <span style="color:#c106d5;">//</span> ZERO</a>
      <a href="/">&larr; Back to Shop with ZERO</a>
    </div>
    <h1>The ZERO Journal</h1>
    <p class="sub">${articles.length} practical buying guides &amp; household notes.</p>
    <div class="grid">${cards}</div>
  </div>
</body>
</html>`;
}

function buildSitemapAndRobots(articles) {
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${SITE_URL}/articles/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    ...articles.map(
      a =>
        `  <url><loc>${SITE_URL}/articles/${a.slug}.html</loc><lastmod>${a.date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
    )
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemap);

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(ROOT_DIR, 'robots.txt'), robots);

  // IndexNow verification file
  fs.writeFileSync(path.join(ROOT_DIR, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
}

async function pingIndexNow(newUrls) {
  if (!newUrls.length) return;
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'theworldhasplenty.org',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: [`${SITE_URL}/`, `${SITE_URL}/articles/`, ...newUrls]
      })
    });
    console.log(`📡 IndexNow ping status: ${res.status}`);
  } catch (err) {
    console.warn('⚠️ IndexNow ping skipped:', err.message);
  }
}

async function run() {
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });

  let articles = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      articles = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      articles = [];
    }
  }

  const existingSlugs = new Set(articles.map(a => a.slug));
  const today = new Date().toISOString().split('T')[0];

  console.log(`🚀 Generating ${ARTICLES_PER_RUN} new SEO/GEO articles...`);
  const topics = await generateTopicBatch([...existingSlugs], ARTICLES_PER_RUN);
  const newlyPublishedUrls = [];

  for (const rawTopic of topics) {
    let slug = slugify(rawTopic.slug || rawTopic.title);
    if (!slug || existingSlugs.has(slug)) {
      slug = `${slug || 'guide'}-${Date.now().toString().slice(-4)}`;
    }

    const meta = {
      slug,
      title: rawTopic.title,
      category: rawTopic.category || 'Smart Shopping',
      keyword: rawTopic.keyword || rawTopic.title,
      store: rawTopic.store || 'amazon',
      searchQuery: rawTopic.searchQuery || rawTopic.keyword,
      date: today
    };

    console.log(`✍️  Writing: ${meta.title}`);
    const content = await generateArticleContent(meta);
    meta.summary = content.summary || content.metaDescription;

    const html = renderArticleHtml(meta, content);
    fs.writeFileSync(path.join(ARTICLES_DIR, `${slug}.html`), html);

    existingSlugs.add(slug);
    articles.unshift(meta);
    newlyPublishedUrls.push(`${SITE_URL}/articles/${slug}.html`);
    console.log(`✓ Saved: /articles/${slug}.html`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(articles, null, 2));
  fs.writeFileSync(path.join(ARTICLES_DIR, 'index.html'), renderArchiveHtml(articles));
  buildSitemapAndRobots(articles);

  console.log(`🗺️  Updated sitemap.xml (${articles.length} articles), robots.txt, and archive.`);
  await pingIndexNow(newlyPublishedUrls);
  console.log('✨ Daily engine run complete.');
}

run().catch(err => {
  console.error('❌ Engine failed:', err);
  process.exit(1);
});
