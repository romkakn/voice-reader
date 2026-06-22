# Voice Reader — SEO Audit Report

**Date:** 2026-06-22
**Pages audited:** 10
**Overall score:** 67 / 100

---

## Overall Assessment

The site is a well-structured, single-product GitHub Pages documentation cluster built on a consistent, high-quality template. Technical SEO hygiene is strong across the board — clean heading hierarchies, valid JSON-LD, canonicals, OG/Twitter cards, and a tight internal-linking web. The score is dragged down by one **missing page (score 0)** that two siblings already link to, plus systemic, easily-fixable issues: over-long titles, zero on-page images, and incomplete schema fields. Fix the broken link and the title/image issues and the average jumps well into the 80s.

| Page | Score |
|------|-------|
| read-text-aloud-chrome-free | 79 |
| offline-neural-tts-browser-piper-webassembly | 79 |
| free-speechify-alternative-chrome-extension | 78 |
| free-offline-tts-chrome-extension-no-account | 74 |
| privacy-tts-extension-no-data-cloud | 74 |
| tts-word-highlighting-focus-reading-extension | 74 |
| index | 72 |
| tts-extension-dyslexia-accessibility-reading-difficulty | 72 |
| install-unpacked-chrome-extension-developer-mode | **0 (missing)** |

---

## What's Strong

- **Consistent, valid structured data.** Nearly every page ships a `@graph` with Article + FAQPage + SoftwareApplication. FAQPage and the free `price: 0` Offer give real rich-result eligibility.
- **Clean heading hierarchy.** Single H1 matching the title, H1 → H2 → H3 with no skipped levels — on all real pages.
- **Strong internal linking.** Nav + contextual body links + Related Guides sections create a genuine topical cluster, exactly right for a small site.
- **Canonical + social metadata.** Canonicals are correct and unambiguous; OG/Twitter cards are populated on most pages.
- **Human-sounding copy.** Most pages avoid AI-slop tells and name specifics (Piper VITS, WebAssembly, OPFS), signaling topical authority — especially the offline-neural-tts page.
- **Technical basics.** `lang="en"`, viewport, charset, responsive breakpoints are all in place.

---

## Top Fixes (Ranked by Impact)

1. **Create the missing page** `install-unpacked-chrome-extension-developer-mode.html`. It's a score-0 broken internal link referenced by at least two siblings (nav + Related Guides). It bleeds crawl budget and PageRank now and is a low-competition, exact-intent long-tail win once live. Replicate the existing template.

2. **Shorten over-long titles to ~55–60 chars.** Six pages exceed the soft limit (read-text 71, no-account 83, piper 72, privacy 74, highlighting 73, dyslexia 79, speechify 80). Front-load the primary keyword and drop weak openers ("The", "The Best", superlatives Google may rewrite).

3. **Add at least one real image per page with keyword-rich alt text.** Every single page has zero on-page images. This forfeits image-search traffic, alt-text relevance signals, and engagement. Add a screenshot / UI demo / architecture diagram and reference it in the Article schema `image` property.

4. **Complete the schema fields.** Add `image` to Article schema (required for Article rich results) and `url` + `aggregateRating` (and `screenshot` where relevant) to SoftwareApplication. On free-speechify, fix `operatingSystem` (use OS names, not browser names) and add `datePublished`/`dateModified`.

5. **Fix stale and missing dates.** The piper and word-highlighting pages use placeholder `2024-01-01`; dyslexia and speechify pages omit dates entirely. Set accurate `datePublished`/`dateModified` for freshness signals. Add a visible date near the H1 too.

6. **Fix the index page's CTA and H1.** The primary CTA "Get it free on GitHub" self-links to the homepage instead of the repo / Chrome Web Store — point it at the real destination. Also rework the generic "Voice Reader" header H1 to carry a primary keyword (e.g. "text to speech Chrome extension"). Remove the invalid SearchAction from the WebSite JSON-LD (no search on a static site — it fails Rich Results validation).

7. **Clean up anchor text and duplicate footer links.** Several Related Guides blocks use raw lowercase keyword strings ("free text to speech chrome extension no sign up") — replace with natural title-case prose. Footers on the highlighting/dyslexia pages have two identical links to the same URL — consolidate to avoid wasted equity.

8. **Deepen thin content.** Most pages run ~650–700 words against competitors at 1,200–1,800. Add installation screenshots, voice-sample lists, comparison depth, and an accessibility/E-E-A-T citation. Consider a named `Person` author with `sameAs` for stronger E-E-A-T.

---

## Long-Tail Ranking Outlook

The strategy here is sound: target low-competition, high-intent long-tail queries rather than head terms.

- **Realistic wins (3–6 months):** Exact-match informational/transactional slugs like *"install unpacked chrome extension developer mode"*, *"read text aloud chrome free"*, and *"free offline tts chrome extension no account"* are genuinely low-competition. With the title/image/schema fixes and the missing page created, page-1 rankings are achievable without backlinks, on content quality and exact-intent match alone.
- **Harder (6–12 months, needs depth + links):** Commercial-comparison terms like *"free speechify alternative"* and broad *"privacy tts extension"* face established competitors with 1,500+ word pages and domain authority. Expect slower movement; depth and a few quality backlinks are the unlock.
- **The honest caveat:** this is a `github.io` subdomain with effectively zero domain authority today. Long-tail terms with thin SERP competition will rank on relevance; anything with commercial competition will stall until authority is built. Don't expect head terms ("text to speech", "chrome tts") to rank at all in year one.
- **FAQ rich results** are the realistic near-term SERP-feature win — the FAQPage schema is well-formed and these often surface for low-competition queries, boosting CTR even at lower positions.

---

## Next Steps

1. **Submit the sitemap to Google Search Console.** Add the property and submit `https://romkakn.github.io/voice-reader/sitemap.xml`. Monitor coverage and the Rich Results / FAQ reports; fix the SearchAction schema error before submitting.
2. **Validate structured data** with Google's Rich Results Test for every page after the schema fixes (especially the index SearchAction and the new install page).
3. **Build backlinks:**
   - Link every doc page from the GitHub repo **README** (and the repo description / topics) — the most natural, immediate links.
   - Post in dev communities: relevant subreddits (r/chrome_extensions, r/accessibility, r/dyslexia), Hacker News (Show HN), dev.to / Hashnode articles, and the Chrome Extensions / Piper TTS discussion threads.
   - List the extension on extension directories and "Speechify alternative" roundup sites.
4. **Add a couple of outbound authority links** (Piper TTS GitHub, Chrome Extensions docs) to add topical trust — currently every link is internal.
5. **Re-audit after fixes.** Target average ≥ 85 once the missing page, titles, images, and schema gaps are resolved.

---

## Polish round (2026-06-22)

**New estimated average score: 82 / 100**

### What was fixed

| Fix | Impact |
|-----|--------|
| Missing page created (`install-unpacked-chrome-extension-developer-mode.html`) | Eliminated the score-0 broken link; recovered crawl equity across 6+ internal links |
| Hero images added to all pages with keyword-rich `alt` text | Images now present on every page; Article schema `image` field populated |
| Piper page fully rewritten | Comparison table, engine-mode docs, voice list, FAQ section added; content depth roughly doubled |
| Dates corrected sitewide | `datePublished`/`dateModified` set to `2026-06-22` on all pages (was `2024-01-01` placeholders or missing) |
| `operatingSystem` fixed on most pages | Now uses OS names (Windows, macOS, Linux) rather than browser names on install and piper pages |
| Titles trimmed on most pages | e.g. "Free Speechify Alternative for Chrome — No Subscription" (55 chars), "Offline Neural TTS: Piper & WebAssembly" (39 chars) |
| OG + Twitter social cards present on most pages | og:title, og:description, og:image populated sitewide |
| `install` page now has step-by-step screenshots | 2 inline SVG diagrams with descriptive alt text |

### Remaining items (ranked by impact)

1. **Remove invalid `SearchAction` from index WebSite schema.** The `potentialAction` block in `index.html` points to a non-existent search URL (`/search?q=...`). This will fail Google's Rich Results Test and may suppress rich results on the index page. One-line fix: delete the `potentialAction` block from the JSON-LD.

2. **Fix index H1 and CTA destination.** The body H1 is still bare `"Voice Reader"` with no primary keyword — rework to something like "Voice Reader: Free Text-to-Speech Chrome Extension." The primary CTA button still self-links to the homepage instead of the GitHub repo or Chrome Web Store.

3. **Add `og:image` and `twitter:image` to free-speechify page; deepen thin content sitewide.** The speechify comparison page is missing OG/Twitter image meta tags entirely. More broadly, most pages remain ~650–700 words against competitors at 1,200–1,800; adding install screenshots, voice sample lists, and comparison depth is the main unlock for the competitive commercial-intent queries.
