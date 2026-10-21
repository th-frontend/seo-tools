# SEO tools

Internal Treehouse toolkit. A dashboard at `/` lists every tool in `tools/`.

## Run

```bash
npm start
```

Then open http://localhost:4321. No dependencies to install (Node 18+).

- `PORT=8080 npm start` to change the port
- `HOST=0.0.0.0 npm start` to let others on your network open it

## Add a tool

1. Create `tools/<slug>/index.html`.
2. The dashboard reads the page's `<title>` (text before ` · `) and `<meta name="description">`.
3. Optional `tools/<slug>/tool.json` overrides them: `{ "name": "...", "description": "...", "category": "..." }`.
