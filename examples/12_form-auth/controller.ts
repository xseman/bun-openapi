import {
	type CanActivate,
	Controller,
	Get,
	Hidden,
	Injectable,
	Post,
	Render,
	Request,
	Route,
	UseGuards,
} from "../../src/index.js";
import { UserService } from "./user.service.js";

const COOKIE_NAME = "token";

const SECURE = process.env["NODE_ENV"] === "production" ? "; Secure" : "";

function buildCookieHeader(token: string): string {
	return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200${SECURE}`;
}

function clearCookieHeader(): string {
	return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${SECURE}`;
}

function tokenFromCookie(request: Request): string | null {
	const cookieHeader = request.headers.get("cookie") ?? "";
	for (const part of cookieHeader.split(";")) {
		const trimmed = part.trim();
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		if (trimmed.slice(0, eq) === COOKIE_NAME) return trimmed.slice(eq + 1) || null;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Guard — verifies the HttpOnly cookie on protected pages
// ---------------------------------------------------------------------------

@Injectable()
export class CookieAuthGuard implements CanActivate {
	constructor(private readonly userService: UserService) {}

	async canActivate({ request }: { request: Request; }) {
		const token = tokenFromCookie(request);
		if (!token) {
			return Response.redirect("/login", 302);
		}

		const user = await this.userService.verifyToken(token);
		if (!user) {
			return Response.redirect("/login", 302);
		}

		return true;
	}
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Route("/")
export class RegistrationController extends Controller {
	constructor(private readonly userService: UserService) {
		super();
	}

	// --- Registration ---

	@Get("/register")
	@Render("register")
	showRegister() {
		return { title: "Register" };
	}

	@Hidden()
	@Post("/register/submit")
	async submitRegister(@Request() request: globalThis.Request) {
		const {
			name = "",
			email = "",
			password = "",
		} = Object.fromEntries(await request.formData()) as Record<string, string>;

		const result = await this.userService.register(name, email, password);
		if (result.error) {
			return new Response(null, {
				status: 302,
				headers: { location: `/register?error=${encodeURIComponent(result.error)}` },
			});
		}

		return new Response(null, {
			status: 302,
			headers: {
				"location": "/dashboard",
				"set-cookie": buildCookieHeader(result.token!),
			},
		});
	}

	// --- Login ---

	@Get("/login")
	@Render("login")
	showLogin() {
		return { title: "Login" };
	}

	@Hidden()
	@Post("/login/submit")
	async submitLogin(@Request() request: globalThis.Request) {
		const { email = "", password = "" } = Object.fromEntries(await request.formData()) as Record<string, string>;

		const result = await this.userService.login(email, password);
		if (result.error) {
			return new Response(null, {
				status: 302,
				headers: { location: `/login?error=${encodeURIComponent(result.error)}` },
			});
		}

		return new Response(null, {
			status: 302,
			headers: {
				"location": "/dashboard",
				"set-cookie": buildCookieHeader(result.token!),
			},
		});
	}

	// --- Dashboard (protected) ---

	@Get("/dashboard")
	@UseGuards(CookieAuthGuard)
	@Render("dashboard")
	async dashboard(@Request() request: globalThis.Request) {
		const token = tokenFromCookie(request)!;
		const user = await this.userService.verifyToken(token);
		if (!user) {
			return Response.redirect("/login", 302);
		}
		return {
			title: "Dashboard",
			name: user.name,
			email: user.email,
		};
	}

	// --- Logout ---

	@Hidden()
	@Get("/logout")
	logout() {
		return new Response(null, {
			status: 302,
			headers: {
				"location": "/login",
				"set-cookie": clearCookieHeader(),
			},
		});
	}
}
