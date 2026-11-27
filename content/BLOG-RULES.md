# Thrivebuild blog rules

Every post must follow these rules, whether a person or an AI writes it. The build script (`scripts/build-blog.js`) checks the rules marked **[checked]**. If a post breaks one of those, the build stops and the site does not deploy.

## Who you are writing for

The owner of a solar or home energy company in the US or UK (solar, battery storage, EV chargers). They are busy, they run a team of roughly 5 to 30 people, and they read on their phone between jobs.

## Length and style

- 900 to 1,400 words in the body. **[checked, warning]**
- Plain English. Short paragraphs of 1 to 3 sentences. Short sentences.
- Practical: every post gives the reader steps they can take this week.
- Use `##` and `###` for sections. Never use `#` in the body, because the template adds the H1 from the title. **[checked]**
- Don't use em dashes. Use a comma, a full stop or brackets instead. **[checked]**
- US or UK spelling is fine. Keep it consistent within a post.

## Honesty

- Write it yourself. Never copy or lightly reword text from other sites.
- Don't make up statistics. Any number about the market, buyers or results must link to a real, reputable source (a government body, a regulator, a trade body or a peer-reviewed study). If you can't find a source, describe the point without a number.
- No client names, no client quotes and no promised results ("double your sales", "save 10 hours a week").
- No placeholders: `[CONFIRM`, `TODO` or `XX%`. **[checked]**

## Positioning

- Write only about solar and home energy companies.
- Never position Thrivebuild for roofing, remodeling or kitchens. **[checked: "roofing", "roofer", "remodel", "kitchen"]**. Mentioning a roof as part of a solar site survey is fine.

## SEO

- Pick **one** search phrase per post (from `content/blog-topics.md`).
- Put it in the title, the first paragraph and the meta description. Set it as `search_phrase` in the front matter so the build can check it. **[checked, warning]**
- The H1 is the title, so it carries the phrase automatically.
- Add at least 2 internal links to `/solar`, `/pricing`, `/case-studies` or another post (`/blog/<slug>`). **[checked, warning]** Every internal link must point to a page that exists. **[checked]**
- Add 1 to 2 links to authoritative outside sources. **[checked, warning]**
- Keep the meta description to 155 characters or fewer. **[checked]**

## Ending

- Finish with a short wrap-up. Don't write your own call to action: the template adds the "Want to see where your deals are leaking?" box and the booking button.

## File format

Save the post as `content/posts/YYYY-MM-DD-slug.md`. The date and slug must match the file name. **[checked]**

```markdown
---
title: How fast should a solar company respond to a new lead?
description: Up to 155 characters, including the search phrase.
date: 2026-11-27
slug: solar-lead-response-time
tags: [Speed to lead, Lead follow-up]
author: Sam Adebayo
reading_time: 6 min read
search_phrase: solar lead response time
---

First paragraph, with the search phrase in it...

## A section heading
```

- `author` is always `Sam Adebayo`. **[checked]**
- `reading_time` is roughly words divided by 230, rounded (for example, "6 min read"). The build prints the word-count estimate so you can check it.
- `search_phrase` is optional for the build, but required by these rules.
- Optional: `updated: YYYY-MM-DD` if you edit a post later.

## Publishing

1. Write the post following the rules above.
2. Run `node scripts/build-blog.js` and fix any errors or warnings.
3. Mark the topic `[x]` in `content/blog-topics.md`.
4. Commit the `.md` file and the generated files (`blog/`, `sitemap.xml`, `index.html`). Vercel also runs the build on every deploy, so a new `.md` file on its own is enough to publish.
