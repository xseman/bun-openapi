import {
	Controller,
	Get,
	Route,
	Summary,
} from "../../src/index.js";

@Route("/")
class HelloController extends Controller {
	@Get()
	@Summary("Say hello")
	hello() {
		return { message: "Hello from bun-openapi!" };
	}
}

export { HelloController };
