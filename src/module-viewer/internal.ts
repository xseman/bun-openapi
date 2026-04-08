import * as d3 from "d3";

import type { ModuleTreeNode } from "../module-tree.js";

export const TYPE_COLORS: Record<string, string> = {
	module: "#6366f1",
	controller: "#0ea5e9",
	provider: "#10b981",
	method: "#f59e0b",
	middleware: "#ec4899",
};

export const TYPE_EMOJIS: Record<string, string> = {
	module: "◈",
	controller: "⬡",
	provider: "◆",
	method: "▸",
	middleware: "⛶",
};

export const RADIUS: Record<string, number> = {
	module: 9,
	controller: 7,
	provider: 6,
	method: 5,
	middleware: 4,
};

export function nodeRadius(d: { data: ModuleTreeNode; }): number {
	return RADIUS[d.data.type] ?? 5;
}

export function nodeLabel(data: ModuleTreeNode): string {
	const emoji = TYPE_EMOJIS[data.type] ?? "•";
	const suffix = data.ref ? " ↩" : "";
	return `${emoji} ${data.name}${suffix}`;
}

export function nodeStroke(data: ModuleTreeNode): string {
	const fill = TYPE_COLORS[data.type] ?? "#64748b";
	return d3.color(fill)?.brighter(0.5).toString() ?? fill;
}

export function layoutModuleTree(treeData: ModuleTreeNode): d3.HierarchyPointNode<ModuleTreeNode> {
	const root = d3.hierarchy<ModuleTreeNode>(treeData, (d) => d.ref ? [] : (d.children ?? []));
	return d3.tree<ModuleTreeNode>()
		.nodeSize([28, 260])
		.separation((a, b) => a.parent === b.parent ? 1 : 1.4)(root);
}

export function moduleTreeLink() {
	return d3.linkHorizontal<d3.HierarchyPointLink<ModuleTreeNode>, d3.HierarchyPointNode<ModuleTreeNode>>()
		.x((d) => d.y)
		.y((d) => d.x);
}
