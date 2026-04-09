import Bun from "bun";
import path from "node:path";

const rootDir = process.cwd();
const docsDir = path.join(rootDir, "docs");
const outDir = path.join(rootDir, "static");
const docsIndexPath = path.join(docsDir, "index.md");

const markdownConf = {
	headings: true,
	autolinks: true,
	tables: true,
	strikethrough: true,
	tasklists: true,
	tagFilter: true,
} as const;

const syntaxHighlightThemeHref = "https://esm.sh/syntax-highlight-element@1.2.0/dist/themes/prettylights.min.css";
const syntaxHighlightScriptSrc = "https://esm.sh/syntax-highlight-element@1.2.0";
const googleFontsHref = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap";

const syntaxHighlightLanguages = [
	"markup",
	"css",
	"javascript",
	"typescript",
	"bash",
	"json",
	"yaml",
];

const languageAliases: Record<string, string> = {
	ts: "typescript",
	js: "javascript",
	sh: "bash",
};

interface SidebarSection {
	title: string;
	items: { label: string; href: string; }[];
}

async function walk(dir: string): Promise<string[]> {
	const entries = await Array.fromAsync(new Bun.Glob("**/*.md").scan({ cwd: dir, onlyFiles: true }));

	return entries.map((entry) => path.join(dir, entry));
}

function rewriteLinkHref(rawHref: string): string {
	if (!rawHref) return rawHref;

	const [href, hash = ""] = rawHref.split("#");

	if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
		return rawHref;
	}

	if (href.endsWith(".md")) {
		const rewritten = href.slice(0, -3) + ".html";
		return hash ? `${rewritten}#${hash}` : rewritten;
	}

	return rawHref;
}

function rewriteMarkdownLinks(markdown: string): string {
	return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string, rawHref: string) => {
		if (!rawHref) return match;
		return `[${label}](${rewriteLinkHref(rawHref)})`;
	});
}

function buildSidebarSections(indexMarkdown: string): SidebarSection[] {
	const sections: SidebarSection[] = [];
	const excludedTitles = new Set(["Additional Links", "Why This Layout"]);
	let current: SidebarSection | undefined;

	for (const rawLine of indexMarkdown.split("\n")) {
		const headingMatch = rawLine.match(/^##\s+(.+)$/);
		if (headingMatch) {
			const title = headingMatch[1].trim();

			if (excludedTitles.has(title)) {
				current = undefined;
				continue;
			}

			current = { title, items: [] };
			sections.push(current);
			continue;
		}

		const linkMatch = rawLine.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)/);
		if (!linkMatch || !current) {
			continue;
		}

		const label = linkMatch[1].trim();
		const href = rewriteLinkHref(linkMatch[2].trim());

		if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
			continue;
		}

		current.items.push({ label, href });
	}

	return sections.filter((section) => section.items.length > 0);
}

function toPosix(relativePath: string): string {
	return relativePath.split(path.sep).join(path.posix.sep);
}

function pageLink(fromOutputRelative: string, targetOutputRelative: string): string {
	const fromDir = path.posix.dirname(fromOutputRelative);
	const raw = path.posix.relative(fromDir, targetOutputRelative);

	if (!raw) {
		return path.posix.basename(targetOutputRelative);
	}

	return raw;
}

function renderSidebarSection(section: SidebarSection, currentFile: string): string {
	const items = section.items
		.map((item) => {
			const target = toPosix(item.href);
			const href = pageLink(currentFile, target);
			const className = target === currentFile ? ' class="current"' : "";

			return `            <li><a${className} href="${escapeHtml(href)}">${escapeHtml(item.label)}</a></li>`;
		})
		.join("\n");

	return `        <section>
            <h2>${escapeHtml(section.title)}</h2>
            <ul>
${items}
            </ul>
        </section>`;
}

function renderSidebar(sections: SidebarSection[], outputRelative: string): string {
	const currentFile = toPosix(outputRelative);
	const homeHref = pageLink(currentFile, "index.html");
	const sectionHtml = sections.map((section) => renderSidebarSection(section, currentFile)).join("\n");

	return `        <aside class="sidebar">
            <div class="brand">
                <a href="${escapeHtml(homeHref)}">bun-openapi</a>
            </div>
            <pagefind-modal-trigger></pagefind-modal-trigger>
${sectionHtml}
        </aside>`;
}

function pageTitleFromMarkdown(markdown: string, fallback: string): string {
	const heading = markdown.match(/^#\s+(.+)$/m);
	if (heading?.[1]) return heading[1].trim();
	return fallback;
}

function languageFromCodeAttrs(attrs: string): string {
	const classMatch = attrs.match(/class="([^"]+)"/);
	if (!classMatch) return "plaintext";

	const token = classMatch[1]
		.split(/\s+/)
		.find((part) => part.startsWith("language-"));

	if (!token) return "plaintext";

	const language = token.slice("language-".length).toLowerCase();

	return languageAliases[language] ?? language;
}

function replaceCodeBlocksWithWebComponent(htmlBody: string): string {
	return htmlBody.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_match, attrs: string, code: string) => {
		const language = languageFromCodeAttrs(attrs);

		return [
			'    <div class="code-wrapper">',
			'        <button class="copy-btn" onclick="copyCode(this)" title="Copy code">Copy</button>',
			`        <syntax-highlight class="code-block" language="${escapeHtml(language)}">${code}</syntax-highlight>`,
			"    </div>",
		].join("\n");
	});
}

function renderBaseStyles(): string[] {
	return [
		"    :root { color-scheme: light; scrollbar-gutter: stable; }",
		"    * { box-sizing: border-box; }",
		"    body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; line-height: 1.55; color: #222; background: #fff; }",
		"    .layout { max-width: 1440px; margin: 0 auto; display: grid; grid-template-columns: 320px minmax(0, 1fr); }",
	];
}

function renderSidebarStyles(): string[] {
	return [
		"    .sidebar { position: sticky; top: 0; height: 100vh; overflow: auto; padding: 28px 18px 28px 28px; border-right: 1px solid #dfdfdf; background: #f7f7f7; }",
		"    pagefind-modal-trigger { display: block; margin-bottom: 14px; }",
		"    pagefind-modal-trigger .pf-trigger-btn { all: unset; display: flex; align-items: center; gap: 6px; box-sizing: border-box; cursor: pointer; font-size: 15px; line-height: 1.33; color: #888; padding: 0 0 1px; }",
		"    pagefind-modal-trigger .pf-trigger-btn:hover { color: #1a1a1a; text-decoration: underline; }",
		"    pagefind-modal-trigger .pf-trigger-shortcut { display: flex; gap: 2px; }",
		"    pagefind-modal-trigger .pf-trigger-key { font-size: 11px; color: #aaa; border: 1px solid #d8d8d8; border-radius: 3px; padding: 0 3px; line-height: 1.6; background: #f3f3f3; }",
		"    .brand { margin: 0 0 18px; font-size: 28px; line-height: 1.05; font-weight: 700; letter-spacing: -0.02em; }",
		"    .brand a { color: #111; text-decoration: none; }",
		"    .sidebar section { margin: 0 0 18px; }",
		"    .sidebar h2 { font-size: 22px; font-weight: 600; color: #111; margin: 0 0 7px; letter-spacing: -0.01em; }",
		"    .sidebar ul { list-style: none; margin: 0; padding: 0; }",
		"    .sidebar li { margin: 0; padding: 0; }",
		"    .sidebar a { display: block; padding: 0 0 1px; color: #1a1a1a; text-decoration: none; font-size: 17px; line-height: 1.28; }",
		"    .sidebar li a { padding-left: 12px; font-size: 15px; line-height: 1.33; }",
		"    .sidebar a.current { color: #111; font-weight: 700; }",
		"    .sidebar a:hover { text-decoration: underline; }",
	];
}

function renderContentStyles(): string[] {
	return [
		"    main { max-width: 980px; padding: 28px 52px 64px; }",
		"    h1, h2, h3, h4 { line-height: 1.22; margin: 1.3em 0 0.45em; }",
		"    h1 { margin-top: 0; font-size: 48px; font-weight: 300; letter-spacing: -0.02em; color: #111; }",
		"    h2 { font-size: 30px; font-weight: 300; color: #111; }",
		"    h3 { font-size: 22px; font-weight: 400; }",
		"    h1 > a, h2 > a, h3 > a, h4 > a { color: inherit; text-decoration: none; }",
		"    p, ul, ol { margin: 0.7em 0; }",
		"    ul, ol { padding-left: 24px; }",
		"    li { margin: 0.18em 0; }",
		"    a { color: #0f4ea8; text-decoration: none; }",
		"    a:hover { text-decoration: underline; }",
		"    hr { border: 0; border-top: 1px solid #ddd; margin: 1.25rem 0; }",
		"    blockquote { margin: 1rem 0; padding: 0.2rem 0 0.2rem 1rem; border-left: 3px solid #d3d3d3; color: #4c4c4c; }",
	];
}

function renderCodeStyles(): string[] {
	return [
		"    syntax-highlight.code-block { display: block; overflow-x: auto; white-space: pre; padding: 12px; border: 1px solid #d8d8d8; background: #ffffff; margin: 0.8em 0; color: #24292f; font-family: 'JetBrains Mono', 'Cascadia Code', Menlo, Monaco, Consolas, monospace; font-size: 0.92em; tab-size: 4; }",
		"    ::highlight(comment), ::highlight(prolog), ::highlight(doctype), ::highlight(cdata) { color: #6a737d; font-style: italic; }",
		"    ::highlight(punctuation) { color: #24292f; }",
		"    ::highlight(property), ::highlight(tag), ::highlight(boolean), ::highlight(number), ::highlight(constant), ::highlight(symbol), ::highlight(deleted) { color: #005cc5; }",
		"    ::highlight(selector), ::highlight(attr-name), ::highlight(string), ::highlight(char), ::highlight(builtin), ::highlight(inserted) { color: #032f62; }",
		"    ::highlight(operator), ::highlight(entity), ::highlight(url), ::highlight(atrule), ::highlight(attr-value), ::highlight(keyword) { color: #d73a49; }",
		"    ::highlight(function), ::highlight(class-name) { color: #6f42c1; }",
		"    ::highlight(regex), ::highlight(important), ::highlight(variable) { color: #e36209; }",
		"    code, pre { font-family: 'JetBrains Mono', 'Cascadia Code', Menlo, Monaco, Consolas, monospace; font-size: 0.92em; }",
		"    pre { overflow-x: auto; padding: 12px; border: 1px solid #d8d8d8; border-radius: 0; background: #fafafa; tab-size: 4; }",
		"    :not(pre) > code { background: #f6f6f6; border: 1px solid #e0e0e0; padding: 1px 4px; border-radius: 2px; }",
		"    .code-wrapper { position: relative; margin: 0.8em 0; }",
		"    .code-wrapper syntax-highlight.code-block { margin: 0; }",
		"    .copy-btn { position: absolute; top: 6px; right: 8px; padding: 2px 8px; font-size: 12px; font-family: inherit; background: #fff; border: 1px solid #c8c8c8; border-radius: 3px; cursor: pointer; opacity: 0; transition: opacity 0.15s; z-index: 1; color: #444; line-height: 1.4; }",
		"    .code-wrapper:hover .copy-btn { opacity: 1; }",
		"    .copy-btn:hover { background: #f0f0f0; border-color: #aaa; }",
	];
}

function renderTableStyles(): string[] {
	return [
		"    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }",
		"    th, td { border: 1px solid #d8d8d8; text-align: left; padding: 8px 10px; vertical-align: top; }",
		"    th { background: #f7f7f7; }",
	];
}

function renderResponsiveStyles(): string[] {
	return [
		"    @media (max-width: 960px) {",
		"      .layout { display: block; }",
		"      .sidebar { position: static; height: auto; border-right: 0; border-bottom: 1px solid #dfdfdf; padding: 14px 16px; background: #f7f7f7; }",
		"      .brand { font-size: 28px; margin-bottom: 10px; }",
		"      .sidebar h2 { font-size: 20px; }",
		"      .sidebar a { font-size: 16px; }",
		"      .sidebar li a { font-size: 15px; }",
		"      main { max-width: none; padding: 20px 16px 44px; }",
		"      h1 { font-size: 38px; }",
		"      h2 { font-size: 28px; }",
		"    }",
	];
}

function renderStyles(): string {
	return [
		renderBaseStyles().join("\n"),
		"",
		renderSidebarStyles().join("\n"),
		"",
		renderContentStyles().join("\n"),
		"",
		renderCodeStyles().join("\n"),
		"",
		renderTableStyles().join("\n"),
		"",
		renderResponsiveStyles().join("\n"),
	].join("\n");
}

function renderSyntaxHighlightConfigScript(): string {
	return [
		"    <script>",
		"        window.she = window.she || {};",
		"        window.she.config = {",
		"            ...(window.she.config || {}),",
		`            languages: ${JSON.stringify(syntaxHighlightLanguages)},`,
		"        };",
		"    </script>",
	].join("\n");
}

function renderCopyCodeScript(): string {
	return [
		"    <script>",
		"        function copyCode(button) {",
		"            var codeBlock = button.nextElementSibling;",
		"            var text = codeBlock ? codeBlock.textContent : '';",
		"",
		"            navigator.clipboard.writeText(text).then(function() {",
		"                button.textContent = 'Copied!';",
		"                setTimeout(function() {",
		"                    button.textContent = 'Copy';",
		"                }, 1500);",
		"            });",
		"        }",
		"    </script>",
	].join("\n");
}

function renderHead(title: string, outputRelative: string): string {
	const pagefindCssHref = escapeHtml(pageLink(outputRelative, "pagefind/pagefind-component-ui.css"));
	const pagefindJsSrc = escapeHtml(pageLink(outputRelative, "pagefind/pagefind-component-ui.js"));

	return `<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${googleFontsHref}" rel="stylesheet">
    <link rel="stylesheet" href="${syntaxHighlightThemeHref}">
    <link rel="stylesheet" href="${pagefindCssHref}">
    <style>
${renderStyles()}
    </style>
${renderSyntaxHighlightConfigScript()}
    <script type="module" src="${syntaxHighlightScriptSrc}"></script>
    <script type="module" src="${pagefindJsSrc}"></script>
</head>`;
}

function renderFooterScripts(): string {
	return renderCopyCodeScript();
}

function wrapHtml(title: string, sidebar: string, body: string, outputRelative: string): string {
	const pagefindBundlePath = escapeHtml(path.posix.dirname(pageLink(outputRelative, "pagefind/pagefind-component-ui.css")) + "/");

	return `<!doctype html>
<html lang="en">
${renderHead(title, outputRelative)}
<body>
    <div class="layout">
${sidebar}
        <main>
${body}
        </main>
    </div>
    <pagefind-config bundle-path="${pagefindBundlePath}"></pagefind-config>
    <pagefind-modal></pagefind-modal>
${renderFooterScripts()}
</body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

async function build(): Promise<void> {
	const markdownFiles = await walk(docsDir);
	const docsIndexMarkdown = await Bun.file(docsIndexPath).text();
	const sidebarSections = buildSidebarSections(docsIndexMarkdown);

	await Bun.$`rm -rf ${outDir}`;

	for (const markdownFile of markdownFiles) {
		const relativePath = path.relative(docsDir, markdownFile);
		const outputRelative = toPosix(relativePath.replace(/\.md$/, ".html"));
		const outputPath = path.join(outDir, outputRelative);

		const markdown = await Bun.file(markdownFile).text();
		const linkedMarkdown = rewriteMarkdownLinks(markdown);
		const htmlBody = replaceCodeBlocksWithWebComponent(Bun.markdown.html(linkedMarkdown, markdownConf));
		const title = pageTitleFromMarkdown(markdown, outputRelative);
		const sidebar = renderSidebar(sidebarSections, outputRelative);
		const html = wrapHtml(title, sidebar, htmlBody, outputRelative);

		await Bun.write(outputPath, html);
	}

	await Bun.$`bunx pagefind --site ${outDir}`;

	console.log(`Generated ${markdownFiles.length} pages in ${outDir}; search index written to ${outDir}/pagefind`);
}

await build();
