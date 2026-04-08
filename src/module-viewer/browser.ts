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

declare const TREE_JSON: string;

export function initModuleViewer(treeData: ModuleTreeNode): void {
	const app = document.getElementById("app");
	if (!(app instanceof HTMLDivElement)) {
		throw new Error("Missing #app root element");
	}

	const header = document.createElement("header");
	const h1 = document.createElement("h1");
	h1.textContent = "◈ Module Hierarchy";
	header.appendChild(h1);

	const legend = document.createElement("div");
	legend.className = "legend";
	for (const [type, color] of Object.entries(TYPE_COLORS)) {
		const item = document.createElement("div");
		item.className = "legend-item";
		const dot = document.createElement("div");
		dot.className = "legend-dot";
		dot.style.background = color;
		item.appendChild(dot);
		item.append(type.charAt(0).toUpperCase() + type.slice(1));
		legend.appendChild(item);
	}
	header.appendChild(legend);
	app.appendChild(header);

	const svgContainer = document.createElement("div");
	svgContainer.id = "svg-container";
	app.appendChild(svgContainer);

	const tooltip = document.createElement("div");
	tooltip.className = "tooltip";
	tooltip.id = "tooltip";
	app.appendChild(tooltip);

	const width = svgContainer.clientWidth || window.innerWidth;
	const height = svgContainer.clientHeight || (window.innerHeight - 50);

	const svg = d3.select<HTMLDivElement, unknown>("#svg-container").append<SVGSVGElement>("svg")
		.attr("viewBox", [0, 0, width, height]);

	const g = svg.append("g");

	svg.call(
		d3.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.2, 3])
			.on("zoom", (event) => g.attr("transform", event.transform)),
	);

	const layoutRoot = layoutModuleTree(treeData);
	const xs = layoutRoot.descendants().map((d) => d.x);
	const ys = layoutRoot.descendants().map((d) => d.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);
	const treeWidth = maxY - minY + 300;
	const treeHeight = maxX - minX + 100;
	const tx = (width - treeWidth) / 2 - minY + 50;
	const ty = (height - treeHeight) / 2 - minX + 50;
	g.attr("transform", `translate(${tx}, ${ty})`);

	g.selectAll(".link")
		.data(layoutRoot.links())
		.join("path")
		.attr("class", (d) => d.target.data.ref ? "link ref" : "link")
		.attr("d", moduleTreeLink());

	const node = g.selectAll(".node")
		.data(layoutRoot.descendants())
		.join("g")
		.attr("class", "node")
		.attr("transform", (d) => `translate(${d.y}, ${d.x})`);

	node.append("circle")
		.attr("r", (d) => nodeRadius(d))
		.attr("fill", (d) => TYPE_COLORS[d.data.type] ?? "#64748b")
		.attr("stroke", (d) => nodeStroke(d.data))
		.attr("opacity", (d) => d.data.ref ? 0.4 : 1);

	node.append("text")
		.attr("x", (d) => nodeRadius(d) + 6)
		.attr("text-anchor", "start")
		.text((d) => nodeLabel(d.data));

	node.on("mousemove", function(event: MouseEvent, d) {
		const lines = [`<b>${d.data.name}</b>`, `type: ${d.data.type}`];
		if (d.data.prefix) lines.push(`prefix: ${d.data.prefix}`);
		if (d.data.verb) lines.push(`verb: ${d.data.verb}`);
		if (d.data.path) lines.push(`path: ${d.data.path}`);
		if (d.data.scope) lines.push(`scope: ${d.data.scope}`);
		if (d.data.providerType) lines.push(`providerType: ${d.data.providerType}`);
		if (d.data.exports?.length) lines.push(`exports: ${d.data.exports.join(", ")}`);
		if (d.data.ref) lines.push("⚠ back-reference (already rendered above)");
		tooltip.innerHTML = lines.join("<br>");
		tooltip.classList.add("visible");
		tooltip.style.left = (event.clientX + 14) + "px";
		tooltip.style.top = (event.clientY - 10) + "px";
	}).on("mouseleave", () => tooltip.classList.remove("visible"));
}

initModuleViewer(JSON.parse(TREE_JSON) as ModuleTreeNode);
