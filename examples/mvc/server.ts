import { classValidator } from "../../src/adapters/class-validator.js";
import { HandlebarsAdapter } from "../../src/adapters/handlebars.js";
import { createApp } from "../../src/index.js";
import { HomeController } from "./controller.js";

const port = 3_000;

const app = createApp({
	schema: classValidator(),
	controllers: [HomeController],
	viewEngine: {
		viewsDir: new URL("./views", import.meta.url).pathname,
		adapter: new HandlebarsAdapter(),
		// cache: false,
	},
});

Bun.serve({
	port: port,
	routes: app.routes,
	fetch: app.fetch,
});

console.table([
	{ name: "Server", url: `http://localhost:${port}` },
	{ name: "Home", url: `http://localhost:${port}/` },
	{ name: "About", url: `http://localhost:${port}/about` },
]);
