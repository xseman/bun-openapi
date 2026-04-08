import {
	Get,
	Render,
	Route,
} from "../../src/index.js";

@Route("/")
export class HomeController {
	@Get()
	@Render("index")
	home() {
		return { title: "Home", message: "Welcome to bun-openapi MVC!" };
	}

	@Get("/about")
	@Render("about")
	about() {
		return {
			title: "About",
			description: "This is a server-side rendering example using bun-openapi.",
			features: [
				"@Render decorator for Handlebars templates",
				"Rendered routes excluded from OpenAPI spec",
				"Template context from controller return value",
				"Template caching in production",
			],
		};
	}
}
