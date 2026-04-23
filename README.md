# CHD Research Portal v2

Modern Chapel Hill Denham research portal built with React and Create React App.

## What it does

- Presents research reports, analyst profiles, funds, pricing lists, and a user library.
- Supports tier-based access for public, member, premium, analyst, intern, director, and administrator roles.
- Includes a branded PDF generator for report downloads.
- Includes an administrator console for reports, banner media, category access rules, user accounts, and library content.

## Local development

```powershell
npm install
npm start
```

## Production build

```powershell
npm run build
```

## GitHub Pages deployment

This repo is prepared for GitHub Pages at:

`https://fisherman45.github.io/chd-research-portal-v2`

Install the deploy helper if it is not already present:

```powershell
npm install --save-dev gh-pages
```

Then publish:

```powershell
npm run deploy
```

## Repository hygiene

- Environment files are ignored through `.gitignore`.
- Keep secrets out of the repo.
- Use `public/chd-logo.png` for the tab icon and branding assets.
