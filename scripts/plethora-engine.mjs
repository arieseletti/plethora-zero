/**
 * PLETHORA // ZERO — Automated Content & SEO Engine
 * Generates high-intent evergreen and seasonal markdown articles for Cloudflare Pages.
 */

import fs from 'fs';
import path from 'path';

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

const TOPICS = [
  {
    slug: 'amazon-smile-alternatives-2026',
    title: 'The Best AmazonSmile Alternatives in 2026: How to Fund Relief While You Shop',
    category: 'Community Giving',
    summary: 'Looking for a friction-free way to support households in need after Amazon discontinued AmazonSmile? Discover how ZERO restores the habit at zero extra cost.',
    keyword: 'AmazonSmile alternative'
  },
  {
    slug: 'monthly-household-restock-budget',
    title: 'The Monthly Household Restock Checklist That Quietly Funds Local Relief',
    category: 'Smart Shopping',
    summary: 'Restocking vitamins, paper goods, and pantry staples? Learn how redirecting standard retailer commissions creates real breathing room for families having a tight month.',
    keyword: 'household budget restock'
  },
  {
    slug: 'refurbished-tech-deals-ebay',
    title: 'Why Certified Refurbished Tech on eBay is Saving Shoppers 50% in 2026',
    category: 'Sustainable Living',
    summary: 'Cut your electronics and home gadget spending in half while automatically routing partner commissions to household micro-grants.',
    keyword: 'certified refurbished tech deals'
  }
];

function generateArticleHtml(article) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title} — PLETHORA // ZERO</title>
  <meta name="description" content="${article.summary}">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container" style="max-width:760px; padding: 40px 20px;">
    <a href="/ZERO" style="color: #c106d5; font-weight: 800; text-decoration: none;">&larr; Back to PLETHORA // ZERO</a>
    <span class="eyebrow" style="margin-top:20px; display:inline-block;">${article.category}</span>
    <h1 class="serif" style="font-size: 38px; margin: 12px 0 20px;">${article.title}</h1>
    <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">${article.summary}</p>
    
    <hr style="border:0; border-top:1px solid #e2e8f0; margin: 24px 0;">
    
    <article style="font-size: 17px; line-height: 1.7; color: #0f172a;">
      <p>When shopping online for everyday essentials like <strong>${article.keyword}</strong>, most consumers assume every dollar spent goes strictly to the retailer. However, standard affiliate commissions are built into almost every major e-commerce transaction.</p>
      <p>Through <a href="/ZERO" style="color:#c106d5; font-weight:700;">PLETHORA // ZERO</a> (#theworldhasplenty), those exact commissions are captured and pooled together to fund $250 household grocery and utility micro-grants—with zero added cost to your receipt and zero proof of hardship required for applicants.</p>
      
      <h3 style="margin-top:28px; margin-bottom:12px;">How You Can Participate</h3>
      <p>You don't need to make a traditional donation or change your household budget. By simply starting your everyday shopping session through our portal, generosity becomes a natural byproduct of your routine purchases.</p>
      
      <div style="margin-top: 36px; padding: 24px; background: #fdf2ff; border: 1px solid #f3c6f8; border-radius: 12px; text-align: center;">
        <h4 style="margin-bottom: 8px;">Ready to Fund Relief at $0 Cost?</h4>
        <p style="font-size: 14px; margin-bottom: 16px;">Launch your next Amazon, eBay, or AliExpress order through our portal.</p>
        <a href="/ZERO" class="launch-btn" style="text-decoration:none; display:inline-block;">Launch ZERO Portal &rarr;</a>
      </div>
    </article>
    
    <footer style="margin-top: 60px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
      &copy; 2026 PLETHORA // ZERO (#theworldhasplenty). All rights reserved.
    </footer>
  </div>
</body>
</html>`;
}

console.log('🚀 Generating PLETHORA SEO Articles...');
if (!fs.existsSync(ARTICLES_DIR)) {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
}

TOPICS.forEach(topic => {
  const filePath = path.join(ARTICLES_DIR, `${topic.slug}.html`);
  fs.writeFileSync(filePath, generateArticleHtml(topic));
  console.log(`✓ Created: /articles/${topic.slug}.html`);
});
console.log('✨ SEO Article Engine run complete.');
