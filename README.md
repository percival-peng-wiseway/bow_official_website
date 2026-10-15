# Bow Projects

BOW Projects Australia website: construction, structures and energy infrastructure.

## Local preview

Requires Node.js and Python 3. There are no npm dependencies.

```sh
npm run build
npm run check
npm run preview
```

Open http://127.0.0.1:4174/.

## Source

- `build.mjs`: static page layouts and generator.
- `content.mjs`: company, services, projects and team content.
- `dist/styles.css` and `dist/app.js`: authored shared styles and browser interactions. These are preserved by the generator.
- `dist/assets/`: supplied photographs, branding, PDFs and background animation.
- Other HTML/JSON/XML files in `dist/` are generated. The site contains 23 content routes and a 404 page.

## Publication

GitHub Actions builds and publishes `dist/` to GitHub Pages on pushes to `main`. The workflow reads the actual Pages origin and base path, so links, assets, search results and canonical URLs work under this project repository path. Enable **Settings → Pages → Source → GitHub Actions**.

For another host, set `SITE_ORIGIN` to the host origin and `BASE_PATH` to its subdirectory (empty for a root domain), then run `npm run build`. Publish `dist/`.

## Contact form

The contact form opens an email draft in the visitor's email application. It has no backend or automatic email delivery. Ongoing projects, team experience and illustrative concepts retain their existing labels.
