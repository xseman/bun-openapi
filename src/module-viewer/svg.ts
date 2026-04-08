import * as d3 from "d3";

import type { ModuleTreeNode } from "../module-tree.js";
import {
	layoutModuleTree,
	moduleTreeLink,
	nodeLabel,
	nodeRadius,
	nodeStroke,
	TYPE_COLORS,
} from "./internal.js";

function escapeXml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function renderModuleTreeSvg(treeData: ModuleTreeNode): string {
	const layoutRoot = layoutModuleTree(treeData);

	const descendants = layoutRoot.descendants();
	const xs = descendants.map((d) => d.x);
	const ys = descendants.map((d) => d.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const width = maxY - minY + 360;
	const height = maxX - minX + 120;
	const tx = -minY + 50;
	const ty = -minX + 50;

	const link = moduleTreeLink();

	const links = layoutRoot.links().map((entry) => {
		const className = entry.target.data.ref ? "link ref" : "link";
		return `<path class="${className}" d="${link(entry) ?? ""}" />`;
	});

	const nodes = descendants.map((d) => {
		const label = nodeLabel(d.data);
		const fill = TYPE_COLORS[d.data.type] ?? "#64748b";
		const stroke = nodeStroke(d.data);
		const opacity = d.data.ref ? 0.4 : 1;
		const title = [
			d.data.name,
			`type: ${d.data.type}`,
			d.data.prefix ? `prefix: ${d.data.prefix}` : "",
			d.data.verb ? `verb: ${d.data.verb}` : "",
			d.data.path ? `path: ${d.data.path}` : "",
			d.data.scope ? `scope: ${d.data.scope}` : "",
			d.data.providerType ? `providerType: ${d.data.providerType}` : "",
			d.data.exports?.length ? `exports: ${d.data.exports.join(", ")}` : "",
			d.data.ref ? "back-reference" : "",
		].filter(Boolean).join("\n");

		return `<g class="node" transform="translate(${d.y}, ${d.x})"><title>${escapeXml(title)}</title><circle r="${nodeRadius(d)}" fill="${fill}" stroke="${stroke}" opacity="${opacity}" /><text x="${nodeRadius(d) + 6}" text-anchor="start">${escapeXml(label)}</text></g>`;
	});

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Module hierarchy">
  <style>
    svg { background: #ffffff; font-family: ui-monospace, monospace; }
    .link { fill: none; stroke: #cbd5e1; stroke-width: 1.5; }
    .link.ref { stroke-dasharray: 4 3; stroke: #94a3b8; }
    .node circle { stroke-width: 2; }
    .node text { font-size: 11px; fill: #1e293b; dominant-baseline: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5px; stroke-linejoin: round; }
  </style>
  <rect width="100%" height="100%" fill="#ffffff" />
  <g transform="translate(${tx}, ${ty})">
    ${links.join("\n    ")}
    ${nodes.join("\n    ")}
  </g>
</svg>`;
}
