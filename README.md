# BOW Projects Australia website

Release revision dated 4 November 2026, corrected to retain the user-selected original visual baseline, implementing BOW-WEB-FBK-001, BOW-WEB-CPY-001 and Image Selection v1. This checkout is `bow_official_website`; the older website variants and the annotation extension have not been changed.

## Run locally

No npm packages are required. Use Node.js 22+ and Python 3 for the audit.

```sh
npm run build
npm run check
npm test
npm run audit
npm run preview
```

Open http://127.0.0.1:4174/. For the original preview address, run `python3 meeting-review/server.py --port 4176` from the parent BowProject directory and open http://127.0.0.1:4176/bow_official_website/people/. The preview no longer injects Page Notes or its toolbar. It forwards only its local form endpoint to 4174; keep the Node preview running for test form submissions. The preview listens on loopback only. The local form records test submissions in ignored `.local/enquiries/` files and explicitly reports that no email is sent. Files in this directory cannot be served by the static preview server.

## Source and content

- `content.mjs`: company, five services, 17 projects, people and per-state hero media configuration.
- `build.mjs`: generates 29 content pages, a legacy concept redirect, 404, sitemap and robots file.
- `dist/styles.css`, `dist/app.js`, `dist/site-model.js`: authored UI and interactions, preserved by the generator.
- `scripts/prepare-review-images.py`: optional image preparation using Pillow; uses the sibling Review Pack without editing its originals. Selected images are already packaged in `dist/assets/`.
- `scripts/audit-site.py`: checks generated links/anchors and creates the image source register.
- `backend/contact-worker.mjs`: hosted enquiry endpoint, ready for separate Cloudflare configuration.

## Local handoff records

The detailed review report, requirement status and image source register remain local handoff files and are not part of the public website.

- `docs/implementation-review-2026-11-04.html`: readable Chinese implementation report and remaining dependencies.
- `docs/requirements-status.csv`: individual requirement status and owner.
- `docs/image-source-register.csv`: every currently referenced image asset, supplied source, pages using it and rights status.
- `docs/review-pack-inventory.json`: all 56 actual Review Pack images, source hashes and usage.
- `output/`: ignored backups, local test evidence and screenshots.

The contact sheet references four videos, A01–A04, which are absent from the supplied folder. State controls and video-loading support exist, but all actual video URLs remain empty. Victoria uses Brighton photography; Queensland uses the supplied Mt Miller site plan. Missing-state selections use a neutral background, never a falsely attributed image. To add authorised footage, populate `video` and optionally `mobileVideo` in `heroScenes`; URLs are site-relative paths. Use web-optimised H.264 MP4 with fast-start and a matching still. No old placeholder animation is loaded.

The six new building projects without a matching supplied photograph use intentional text covers. Do not substitute photos from other projects. F01–F06 KPA images are excluded. Prior team project pages remain clearly labelled and still need BOW's final approval of the list and image rights.

## Hosted contact form

Current hosting is static GitHub Pages, which cannot run the form backend. Deploy the included Worker separately if this proposed provider is approved:

1. Configure a verified Resend sending domain and `CONTACT_FROM` in `backend/wrangler.toml`.
2. Set exact allowed website origins in `ALLOWED_ORIGINS`. Use distinct rate-limit namespaces appropriate to the target Cloudflare account. No production account is selected or configured by this change.
3. Provision `RESEND_API_KEY` as a Worker secret using Cloudflare secret management. Never put it into the static build or chat.
4. Deploy the Worker, then build the website with `CONTACT_ENDPOINT` set to its real HTTPS URL.
5. Test provider acceptance and actual delivery to `info@bowprojects.com.au` separately. The visitor address is Reply-To; the recipient is pinned in server code.

The endpoint validates JSON and field limits, uses a honeypot, origin allowlisting, per-client and site-wide rate limits, and provider idempotency keys. It fails closed if the mail service or required limits are unconfigured. No actual email was sent during implementation. Provider acceptance is not a guarantee of inbox delivery.

References: https://resend.com/docs/api-reference/emails/send-email and https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ and https://developers.cloudflare.com/workers/configuration/secrets/

## Build for existing GitHub Pages hosting

```sh
SITE_ORIGIN=https://percival-peng-wiseway.github.io BASE_PATH=/bow_official_website CONTACT_ENDPOINT=https://YOUR-APPROVED-ENQUIRY-ENDPOINT npm run build
npm run check
npm test
npm run audit
```

Without a configured hosted endpoint, the public website disables submission and displays the contact email instead of pretending to send a message. Local preview still uses its test outbox.

The existing GitHub Actions workflow publishes pushes to `main`. The release workflow now runs the model/contact tests and generated-site audit before publishing. Detailed local review material is kept out of the public source release; the route list and non-confidential image inventory support repeatable builds and audits. The two existing capability PDFs are retained until BOW provides the new file.

## Visual baseline

The linked public GitHub Pages homepage HTML and stylesheet were downloaded and compared byte-for-byte with commit d6bc092 on 4 November 2026; both matched. Evidence is recorded in `docs/baseline-verification.json`. The shared CSS starts with that original stylesheet. Keep the original horizontal brand, left Menu pill, native menu dialog, page-heading/people-directory/person-card structure and existing detail layouts. Add content and requirement-specific styles after this baseline; do not replace it with a new visual theme. The simplified six-item navigation stays inside Menu; search remains removed and the header CTA is Contact, as requested in BOW feedback. Page Notes injection was removed from the website preview at the user’s request. Previously saved browser notes are not modified.

## Latest requested UI

The contact-page email is enlarged and LinkedIn uses an accessible icon button. The homepage state selector uses a borderless frosted capsule and sliding gold highlight with reduced-motion support. All are included in this original-baseline revision. The local 49-row requirement register includes these requests and the Page Notes removal.
