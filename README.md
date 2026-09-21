# Thrivebuild.co — Remodeling Systems Consultancy

A high-converting, single-page marketing website built from scratch to turn residential remodeling and design-build contractors ($1M–$10M revenue) arriving from LinkedIn and cold outreach into booked 45-minute "Workflow Map" calls.

Zero build step required. Deploy instantly by dragging this folder onto Netlify.

---

## File Structure & What Each File Does

- `index.html`: All page copy, markup, Tailwind configuration, and the 10 conversion sections live here. This is the only file you normally edit.
- `assets/styles.css`: CSS custom property tokens (`:root`), accessible focus rings, ambient glow utilities, and accordion animation rules.
- `assets/main.js`: Mobile drawer navigation, single-open FAQ accordion enhancement, and Calendly embed manager with fallback handling.
- `assets/img/`: Inline and standalone vector SVG mocks for the 16:10 pipeline preview and three 4:3 proof diagrams.
- `netlify.toml`: Netlify deployment configuration and production security headers.

---

## Placeholder Replacement Guide

Search for `[` or `EXAMPLE COPY` in `index.html` to find every customizable slot.

| Placeholder | Location in `index.html` | Purpose / Description |
| :--- | :--- | :--- |
| `[YOUR-ID]` | Line ~67 | Google Analytics 4 (GA4) measurement ID (e.g. `G-XXXXXXXXXX`). |
| *(Active)* | `assets/main.js` line 9 | Connected to `https://calendly.com/samthriver/workflow`. |
| *(Active)* | `index.html` lines 1002, 1036, 1070 | Contact email connected to `aythriver@gmail.com`. |
| *(Active)* | `index.html` line 1073 | LinkedIn profile connected to `https://www.linkedin.com/in/sam-adebayo`. |
| `<!-- EXAMPLE COPY — REPLACE -->` | Lines 600, 629 | Proof section case-study background narrative & quote. |
| `[MR]` | Line 634 | Client avatar initials in case-study quote. |
| `[MICHAEL R.]` | Line 636 | Client name attribution in case-study quote. |
| `[APEX DESIGN-BUILD]` | Line 637 | Client company name in case-study quote. |
| `[AUSTIN, TX]` | Line 637 | Client city and state in case-study quote. |
| *(Active)* | Line 1076 | Location set to `Lagos, Nigeria`. |

---

## How to Swap Your Booking Link

Open `assets/main.js` and edit the single constant at the very top (Line 9):

```javascript
const CALENDLY_URL = "https://calendly.com/samthriver/workflow";
```

### Using Another Scheduler (HubSpot Meetings, Cal.com, Acuity)
If you switch to Cal.com or HubSpot Meetings:
1. Update `CALENDLY_URL` in `assets/main.js` to your new link.
2. In `index.html`, replace the `.calendly-inline-widget` container in `#book` with your scheduler's embed iframe or script.
3. The fallback panel automatically picks up the URL from `CALENDLY_URL`.

---

## How to Change Colors & Palette

All brand colors, backgrounds, borders, and focus rings are defined in `assets/styles.css` under `:root`.

To swap from the default Trade-Native Burnt Orange to another palette:

```css
/* In assets/styles.css */
:root {
  --ink: #0F172A;          /* Headings, dark band background */
  --body: #475569;         /* Body copy */
  --line: #E2E8F0;         /* Borders and dividers */
  --surface: #FFFFFF;      /* Card and page background */
  --surface-alt: #F8FAFC;  /* Alternating section bands */
  --brand: #C2410C;        /* Main CTA accent color */
  --brand-hover: #9A3412;  /* Button hover color */
  --brand-tint: #FFF7ED;   /* Pill badge background */
}
```

If you change `--brand`, also update the color alias in the `<script>` block in `index.html` under `tailwind.config`.

---

## Deploy to Netlify (Zero Build Step)

1. Log into [app.netlify.com](https://app.netlify.com).
2. Go to **Sites** and drag-and-drop the entire `Thrivebuild.co` folder into the upload zone.
3. In Site Settings, navigate to **Domain Management** and click **Add custom domain**.
4. Enter `thrivebuild.co`.
5. Point your DNS records at your domain registrar:
   - **Apex (`thrivebuild.co`)**: `A` record pointing to Netlify's load balancer IP (`75.2.60.5`).
   - **Subdomain (`www.thrivebuild.co`)**: `CNAME` record pointing to your Netlify site URL (e.g., `your-site-name.netlify.app`).

---

## Deploy to Vercel (Zero Build Step)

### Option A: Via Vercel CLI
1. In your terminal inside `C:\Users\USER\Thrivebuild.co`, run:
   ```bash
   npx vercel
   ```
2. Accept the default prompts (it automatically detects a static site with `vercel.json`).
3. Run `npx vercel --prod` when ready to deploy to your production domain.

### Option B: Via GitHub & Vercel Dashboard
1. Push this folder to a GitHub repository.
2. In your [Vercel Dashboard](https://vercel.com/new), select **Add New Project** and import your repository.
3. Keep default settings (Framework Preset: **Other**, Root Directory: `./`).
4. Click **Deploy**. Vercel will serve `index.html` statically and apply the security headers in `vercel.json`.

---

## Optional: Freeze Tailwind CSS for Maximum Lighthouse Score (99+)

The site currently compiles Tailwind classes on-the-fly in the browser via Tailwind's Play CDN script (~120 KB). This enables editing without any build tools.

If you later want an instant 99+ Lighthouse performance score:
1. Run this one-time command in your terminal:
   ```bash
   npx -y tailwindcss -i assets/styles.css -o assets/dist.css --minify
   ```
2. In `index.html`, remove `<script src="https://cdn.tailwindcss.com"></script>` and the inline `tailwind.config` block.
3. Update the stylesheet link to point to `<link rel="stylesheet" href="assets/dist.css">`.
