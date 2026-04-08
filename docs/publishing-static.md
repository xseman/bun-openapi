# Publishing to Static Output

[Docs Home](index.md) | [Previous: Production Checklist](production-checklist.md) | [Next: FAQ](faq.md)

This project keeps documentation in plain Markdown files and prepares it for a future static export to /static.

## Current Contract

- Source files: docs/**/*.md
- Output target (future workflow): /static/**
- Keep all links relative between markdown pages.

## Bun Markdown Compatibility Notes

When converting Markdown to HTML with Bun.markdown.html, enable heading links and useful GFM options.

```ts
const html = Bun.markdown.html(markdown, {
	headings: true,
	autolinks: true,
	tables: true,
	strikethrough: true,
	tasklists: true,
});
```

## Suggested Future Export Behavior

- Mirror docs folder structure into /static.
- Convert each .md to an .html file with the same relative path.
- Preserve relative links by rewriting .md links to .html links during export.

## Out Of Scope Right Now

- No GitHub Pages workflow is implemented in this step.
- No custom CSS pipeline is required.
