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

function renderNavSection(section: SidebarSection, currentFile: string): string {
	const items = section.items
		.map((item) => {
			const target = toPosix(item.href);
			const href = pageLink(currentFile, target);
			const activeClass = target === currentFile ? ' class="active"' : "";

			return `                <li${activeClass}><a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a></li>`;
		})
		.join("\n");

	return `            <div class="nav-group">
                <div class="nav-group-title">${escapeHtml(section.title)}</div>
                <ul class="nav-list">
${items}
                </ul>
            </div>`;
}

function renderNavPanels(sections: SidebarSection[], currentFile: string): string {
	const groupsHtml = sections.map((section) => renderNavSection(section, currentFile)).join("\n");
	return `<nav class="sidebar-nav" aria-label="Documentation">
${groupsHtml}
        </nav>`;
}

function renderSidebar(sections: SidebarSection[], outputRelative: string): string {
	const currentFile = toPosix(outputRelative);
	const homeHref = pageLink(currentFile, "index.html");
	const navHtml = renderNavPanels(sections, currentFile);

	return `        <aside class="sidebar">
            <div class="sidebar-header">
                <a href="${escapeHtml(homeHref)}" class="brand-link">bun-openapi</a>
                <button class="menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="mobile-nav"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
            </div>
            <div class="sidebar-search">
                <pagefind-modal-trigger></pagefind-modal-trigger>
            </div>
            ${navHtml}
        </aside>
        <dialog class="mobile-nav" id="mobile-nav" aria-label="Navigation">
            <div class="sidebar-header">
                <a href="${escapeHtml(homeHref)}" class="brand-link">bun-openapi</a>
                <button class="mobile-nav-close icon-btn" aria-label="Close menu">&#x2715;</button>
            </div>
            ${navHtml}
        </dialog>`;
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

function renderStyles(): string {
	return `
    /* ── Variables ── */
    :root {
        --font-sans: system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        --font-mono: 'JetBrains Mono', 'Cascadia Code', ui-monospace, Menlo, Monaco, Consolas, monospace;
        --text: #363636;
        --text-bright: #000;
        --text-muted: #70777f;
        --background: #fff;
        --background-alt: #f7f7f7;
        --background-code: #efefef;
        --border: #dbdbdb;
        --link: #0076d1;
        --link-hover: #005a9e;
        --highlight: #b5722a;
        --sidebar-width: 280px;
        --content-max-width: 900px;
        --radius: 6px;
        --transition: 0.15s ease;
        color-scheme: light;
        scrollbar-gutter: stable;
    }

    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: var(--font-sans); font-size: 16px; line-height: 1.6; color: var(--text); background: var(--background); }
    a { color: var(--link); text-decoration: none; }
    a:hover { color: var(--link-hover); text-decoration: underline; }

    /* ── Skip link ── */
    .skip-link { position: absolute; top: -100%; left: 1rem; z-index: 10000; padding: 0.5rem 1rem; background: var(--background); border: 2px solid var(--link); border-radius: var(--radius); color: var(--link); font-weight: 600; }
    .skip-link:focus { top: 1rem; }

    /* ── Layout ── */
    .site-wrapper { display: flex; min-height: 100vh; }

    /* ── Sidebar ── */
    .sidebar { position: fixed; top: 0; left: 0; width: var(--sidebar-width); height: 100vh; background: var(--background-alt); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; z-index: 100; }
    .sidebar-header { padding: 1.25rem 1rem 0.5rem; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
    .brand-link { font-size: 1.15rem; font-weight: 700; color: var(--text-bright); text-decoration: none; letter-spacing: -0.01em; }
    .brand-link:hover { text-decoration: none; color: var(--link); }
    .sidebar-search { padding: 0.5rem 1rem 0.5rem; flex-shrink: 0; }
    .sidebar-search pagefind-modal-trigger { display: block; width: 100%; }
    .sidebar-nav { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 0.25rem 0.5rem 2rem; }

    /* ── Nav groups ── */
    .nav-group { margin-top: 1.5rem; }
    .nav-group:first-child { margin-top: 0.25rem; }
    .nav-group-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 0 0 0.25rem 0.5rem; }
    .nav-list { list-style: none; margin: 0; padding: 0; border-left: 1px solid var(--border); margin-left: 0.5rem; }
    .nav-list li { margin: 0; }
    .nav-list a { display: block; padding: 5px 0.5rem; color: var(--text); font-size: 0.9rem; text-decoration: none; border-left: 2px solid transparent; margin-left: -1px; padding-left: calc(0.5rem - 1px); transition: background var(--transition), color var(--transition), border-color var(--transition); }
    .nav-list a:hover { background: var(--background); border-left-color: var(--text-muted); text-decoration: none; color: var(--text-bright); }
    .nav-list li.active a { border-left-color: var(--link); color: var(--link); font-weight: 500; }

    /* ── Main content ── */
    .main-content { position: relative; margin-left: var(--sidebar-width); flex: 1; padding: 2rem 2rem 4rem calc(2rem * 2); max-width: calc(var(--content-max-width) + var(--sidebar-width) + 2rem * 3); min-width: 0; }
    .content { max-width: var(--content-max-width); }
    .content-header h1 { margin: 0 0 1.5rem; font-size: 2rem; font-weight: 600; color: var(--text-bright); line-height: 1.2; }
    .content-body h2 { margin: 2.5rem 0 1rem; font-size: 1.5rem; font-weight: 600; color: var(--text-bright); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .content-body h3 { margin: 1.5rem 0 0.5rem; font-size: 1.2rem; font-weight: 600; color: var(--text-bright); }
    .content-body h4 { margin: 1.25rem 0 0.35rem; font-size: 1rem; font-weight: 600; color: var(--text-bright); }
    .content-body :is(h2,h3,h4) { margin-top: 2.5rem; }
    .content-body :is(h1,h2,h3,h4,h5,h6) + :is(h2,h3,h4,h5,h6) { margin-top: 0; }
    .content-body h1 > a, .content-body h2 > a, .content-body h3 > a, .content-body h4 > a { color: inherit; text-decoration: none; }
    .content-body p { margin: 0 0 1rem; }
    .content-body ul, .content-body ol { margin: 0 0 1rem; padding-left: 1.5rem; }
    .content-body li { margin: 0.25rem 0; }
    .content-body hr { border: 0; border-top: 1px solid var(--border); margin: 1.25rem 0; }
    .content-body blockquote { margin: 1rem 0; padding: 0.2rem 0 0.2rem 1rem; border-left: 3px solid var(--border); color: var(--text-muted); }

    /* ── Inline code ── */
    .content-body code { font-family: var(--font-mono); font-size: 0.9em; background: var(--background-code); padding: 0.15em 0.4em; border-radius: 4px; }
    .content-body code:not([data-lang]) { color: var(--highlight); }
    .content-body pre { background: var(--background-code); padding: 1rem; border-radius: var(--radius); overflow-x: auto; margin: 0 0 1rem; }
    .content-body pre code { background: none; padding: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text); }

    /* ── Code blocks (web component) ── */
    syntax-highlight.code-block { display: block; overflow-x: auto; white-space: pre; padding: 12px; border-radius: var(--radius); background: var(--background-code); margin: 0.8em 0; color: #24292f; font-family: var(--font-mono); font-size: 0.875em; tab-size: 4; }
    ::highlight(comment), ::highlight(prolog), ::highlight(doctype), ::highlight(cdata) { color: #6a737d; font-style: italic; }
    ::highlight(punctuation) { color: #24292f; }
    ::highlight(property), ::highlight(tag), ::highlight(boolean), ::highlight(number), ::highlight(constant), ::highlight(symbol), ::highlight(deleted) { color: #005cc5; }
    ::highlight(selector), ::highlight(attr-name), ::highlight(string), ::highlight(char), ::highlight(builtin), ::highlight(inserted) { color: #032f62; }
    ::highlight(operator), ::highlight(entity), ::highlight(url), ::highlight(atrule), ::highlight(attr-value), ::highlight(keyword) { color: #d73a49; }
    ::highlight(function), ::highlight(class-name) { color: #6f42c1; }
    ::highlight(regex), ::highlight(important), ::highlight(variable) { color: #e36209; }
    code, pre { font-family: var(--font-mono); font-size: 0.92em; }
    pre { overflow-x: auto; padding: 12px; border-radius: var(--radius); background: var(--background-code); tab-size: 4; }
    :not(pre) > code { background: var(--background-code); padding: 1px 4px; border-radius: 4px; color: var(--highlight); }
    .code-wrapper { position: relative; margin: 0.8em 0; }
    .code-wrapper syntax-highlight.code-block { margin: 0; }
    .copy-btn { position: absolute; top: 6px; right: 8px; padding: 2px 8px; font-size: 12px; font-family: inherit; background: var(--background); border: 1px solid var(--border); border-radius: 3px; cursor: pointer; opacity: 0; transition: opacity 0.15s; z-index: 1; color: var(--text-muted); line-height: 1.4; }
    .code-wrapper:hover .copy-btn { opacity: 1; }
    .copy-btn:hover { background: var(--background-alt); }

    /* ── Tables ── */
    .content-body table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.95rem; }
    .content-body th, .content-body td { border: 1px solid var(--border); text-align: left; padding: 0.5rem 1rem; vertical-align: top; }
    .content-body th { background: var(--background-alt); font-weight: 600; }

    /* ── TOC aside ── */
    .toc-aside { display: none; position: absolute; top: 0; right: 2rem; width: 200px; height: 100%; }
    .toc { position: sticky; top: 2rem; max-height: calc(100vh - 4rem); overflow-y: auto; padding-top: 2rem; }
    .toc-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 0 0 0.25rem; padding-left: 10px; }
    .toc ul { list-style: none; margin: 0; padding: 0; }
    .toc ul ul { padding-left: 0.75rem; }
    .toc li { margin: 0; }
    .toc a { display: block; padding: 3px 0 3px 10px; color: var(--text-muted); border-left: 1.5px solid transparent; transition: color var(--transition), border-color var(--transition); font-size: 0.8rem; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .toc a:hover { color: var(--text); text-decoration: none; }
    .toc a.is-active { color: var(--link); border-left-color: var(--link); }
    @media (min-width: 1200px) {
        .toc-aside { display: block; }
        .content { max-width: calc(100vw - var(--sidebar-width) - 200px - 2rem * 4); }
    }
    @media (min-width: 1500px) {
        .content { max-width: var(--content-max-width); }
    }

    /* ── Mobile nav ── */
    .menu-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-muted); border-radius: 5px; }
    .menu-toggle:hover { background: var(--background-alt); color: var(--text); }
    .icon-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; border-radius: 6px; background: transparent; cursor: pointer; color: var(--text-muted); transition: background var(--transition); padding: 0; font-size: 1rem; }
    .icon-btn:hover { background: var(--background); }
    .mobile-nav { display: none; }
    .mobile-nav[open] { display: flex; flex-direction: column; position: fixed; top: 0; left: 0; width: var(--sidebar-width); height: 100vh; max-width: 100vw; background: var(--background-alt); border: none; border-right: 1px solid var(--border); padding: 0; margin: 0; z-index: 1000; overflow-y: auto; color: var(--text); }
    .mobile-nav::backdrop { background: rgba(0,0,0,0.5); }
    .mobile-nav .sidebar-nav { flex: 1; }
    .mobile-nav-close { font-size: 1.1rem; }
    @media (max-width: 900px) {
        .sidebar { position: static; width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border); overflow: visible; flex-direction: row; align-items: center; flex-wrap: wrap; padding: 0; }
        .sidebar-header { flex: 1; padding: 0.75rem 1rem; }
        .sidebar-search { display: none; }
        .sidebar-nav { display: none; }
        .menu-toggle { display: flex; margin-right: 0.75rem; }
        .site-wrapper { flex-direction: column; }
        .main-content { margin-left: 0; padding: 1.5rem 1rem 3rem; max-width: 100%; }
        .toc-aside { display: none !important; }
    }

    /* ── Focus ── */
    .icon-btn:focus-visible, .menu-toggle:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
    .nav-list a:focus-visible { outline: 2px solid var(--link); outline-offset: -2px; }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
    }`;
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

function copyCode(button: Element): void {
	const codeBlock = button.nextElementSibling;
	const text = codeBlock?.textContent ?? "";

	navigator.clipboard.writeText(text).then(function() {
		button.textContent = "Copied!";
		setTimeout(function() {
			button.textContent = "Copy";
		}, 1_500);
	});
}

function renderCopyCodeScript(): string {
	return `    <script>${copyCode.toString()}</script>`;
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

function buildToc(htmlBody: string): string {
	const headingRe = /<h([23])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
	const entries: { level: number; id: string; text: string; }[] = [];
	let m: RegExpExecArray | null;
	while ((m = headingRe.exec(htmlBody)) !== null) {
		const level = parseInt(m[1], 10);
		const id = m[2];
		const text = m[3].replace(/<[^>]+>/g, "").trim();
		entries.push({ level, id, text });
	}
	if (entries.length < 2) return "";

	// Build nested list: wrap h3 entries inside a sub-ul
	let html = "";
	let inSub = false;
	for (const e of entries) {
		if (e.level === 3) {
			if (!inSub) {
				html += "<ul>";
				inSub = true;
			}
			html += `\n        <li><a href="#${escapeHtml(e.id)}">${escapeHtml(e.text)}</a></li>`;
		} else {
			if (inSub) {
				html += "\n    </ul>";
				inSub = false;
			}
			html += `\n    <li><a href="#${escapeHtml(e.id)}">${escapeHtml(e.text)}</a></li>`;
		}
	}
	if (inSub) html += "\n    </ul>";

	return `<aside class="toc-aside">
    <div class="toc">
        <p class="toc-title">On this page</p>
        <ul>${html}
        </ul>
    </div>
</aside>`;
}

function tocScript(): void {
	var toc = document.querySelector(".toc");
	if (!toc) return;

	var links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
	var headings: { el: HTMLElement; link: HTMLAnchorElement; }[] = [];
	links.forEach(function(link) {
		var id = link.getAttribute("href")!.slice(1);
		var el = document.getElementById(id);
		if (el) headings.push({ el: el, link: link });
	});
	if (!headings.length) return;

	var current: HTMLAnchorElement | null = null;
	function activate(link: HTMLAnchorElement | null): void {
		if (link === current) return;
		current = link;
		links.forEach(function(l) {
			l.classList.remove("is-active");
		});
		if (link) link.classList.add("is-active");
	}

	var ticking = false;
	function onScroll(): void {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(function() {
			ticking = false;
			var atBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 50);
			var active: HTMLAnchorElement | null = null;
			if (atBottom) {
				active = headings[headings.length - 1].link;
			} else {
				for (var i = 0; i < headings.length; i++) {
					if (headings[i].el.getBoundingClientRect().top <= window.innerHeight * 0.35) {
						active = headings[i].link;
					}
				}
			}
			activate(active);
		});
	}

	var scrollBehavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
	links.forEach(function(link) {
		link.addEventListener("click", function(e) {
			e.preventDefault();
			var id = link.getAttribute("href")!.slice(1);
			var target = document.getElementById(id);
			if (target) {
				if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
				var top = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.15;
				window.scrollTo({ top: top, behavior: scrollBehavior });
				target.focus({ preventScroll: true });
				history.pushState(null, "", "#" + id);
			}
		});
	});

	window.addEventListener("scroll", onScroll, { passive: true });
	onScroll();
}

function renderTocScript(): string {
	return `<script>(${tocScript.toString()})()</script>`;
}

function mobileNavScript(): void {
	var menuToggle = document.querySelector<HTMLElement>(".menu-toggle");
	var mobileNav = document.getElementById("mobile-nav") as HTMLDialogElement | null;
	if (!menuToggle || !mobileNav) return;

	const nav = mobileNav;
	const toggle = menuToggle;
	toggle.addEventListener("click", function() {
		nav.showModal();
		toggle.setAttribute("aria-expanded", "true");
	});

	nav.addEventListener("close", function() {
		toggle.setAttribute("aria-expanded", "false");
		toggle.focus();
	});

	nav.addEventListener("click", function(e) {
		if (e.target === nav) nav.close();
	});

	var closeBtn = nav.querySelector(".mobile-nav-close");
	if (closeBtn) {
		closeBtn.addEventListener("click", function() {
			nav.close();
		});
	}
	nav.querySelectorAll("a").forEach(function(link) {
		link.addEventListener("click", function() {
			nav.close();
		});
	});
}

function renderMobileNavScript(): string {
	return `<script>(${mobileNavScript.toString()})()</script>`;
}

function wrapHtml(title: string, sidebar: string, body: string, outputRelative: string, toc: string): string {
	// bundle-path is resolved by pagefind-component-ui.js relative to its own URL (pagefind/pagefind-component-ui.js),
	// so "./" always points to the co-located pagefind.js regardless of which HTML page is being rendered.
	// Using a page-relative path like "pagefind/" fails for root-level pages because the browser
	// treats it as a bare module specifier (no leading ./ or ../).
	const pagefindBundlePath = escapeHtml("./");

	return `<!doctype html>
<html lang="en">
${renderHead(title, outputRelative)}
<body>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <div class="site-wrapper">
${sidebar}
        <div class="main-content">
            <article class="content" id="main-content">
                <header class="content-header">
                    <h1>${escapeHtml(title)}</h1>
                </header>
                <div class="content-body">
${body}
                </div>
            </article>
${toc}
        </div>
    </div>
    <pagefind-config bundle-path="${pagefindBundlePath}"></pagefind-config>
    <pagefind-modal></pagefind-modal>
${renderFooterScripts()}
${renderTocScript()}
${renderMobileNavScript()}
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
		const rawHtmlBody = replaceCodeBlocksWithWebComponent(Bun.markdown.html(linkedMarkdown, markdownConf));

		// Strip the first <h1> since content-header already renders the page title
		const htmlBody = rawHtmlBody.replace(/^(\s*<h1[^>]*>[\s\S]*?<\/h1>\s*)/, "");
		const title = pageTitleFromMarkdown(markdown, outputRelative);
		const sidebar = renderSidebar(sidebarSections, outputRelative);
		const toc = buildToc(htmlBody);
		const html = wrapHtml(title, sidebar, htmlBody, outputRelative, toc);

		await Bun.write(outputPath, html);
	}

	await Bun.$`bunx pagefind --site ${outDir}`;

	console.log(`Generated ${markdownFiles.length} pages in ${outDir}; search index written to ${outDir}/pagefind`);
}

await build();
