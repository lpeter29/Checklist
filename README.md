# Monthly Checklist

A small, dependency-free web app for tracking a monthly checklist across a set of
branches or people, with automatic completion percentages. Pure HTML/CSS/JS —
no build step, no libraries — so it's tiny and works as a static GitHub Pages site.

## Files
- `index.html` — page structure
- `style.css` — styling (mobile-first)
- `script.js` — all app logic

## How it works
- Each entry is either a **Person** or a **Branch**, and each one has its own,
  separate list of tasks — tasks are not shared between entries.
- **People** additionally get a purchase calculator: set fixed prices per
  product (e.g. Small = 12, Big = 22) in Setup, then enter a quantity in the
  Checklist tab and the line total and grand total calculate automatically.
- **Checklist tab** — pick a month, then tick off each person/branch's own
  tasks, and enter purchase quantities for people.
- **Summary tab** — overall task completion %, a per-entity breakdown, and the
  total amount collected across all people for the month.
- **Setup tab** — this is your customizable template:
  - Change the app title and accent color.
  - Add a person or branch, and manage its own tasks.
  - For people, manage their product list and fixed prices.
  - Export your data to a `.json` file (backup, or move it to another device),
    or import one back in.

Data is stored in the browser's `localStorage`, per device/browser — it does not
sync between phone and desktop automatically. Use Export/Import to move it.

## Publish on GitHub Pages
1. Create a new GitHub repository (public or private, Pages works with either
   on paid plans; public repos get free Pages).
2. Upload `index.html`, `style.css`, and `script.js` to the repo root.
3. Go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to `Deploy from a branch`.
5. Choose the `main` branch and `/ (root)` folder, then **Save**.
6. Wait a minute, then open the URL GitHub shows you
   (usually `https://<your-username>.github.io/<repo-name>/`).

The app works fully offline once loaded — no server or backend is needed.

## Customizing further
Everything a non-developer needs to personalize is in the **Setup** tab.
If you want to change fonts, colors beyond the accent, or layout, edit
`style.css` — it's a single small file with plain CSS variables at the top.
