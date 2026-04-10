import {
	Controller,
	Get,
	Hidden,
	Injectable,
	Render,
	Request,
	Route,
	UseGuards,
	type CanActivate,
} from "../../src/index.js";
import { UserService } from "./user.service.js";

const COOKIE_NAME = "token";

function buildCookieHeader(token: string): string {
	return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`;
}

function clearCookieHeader(): string {
	return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

function tokenFromCookie(request: Request): string | null {
	const cookieHeader = request.headers.get("cookie") ?? "";
	for (const part of cookieHeader.split(";")) {
		const [key, value] = part.trim().split("=");
		if (key === COOKIE_NAME) return value ?? null;
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
	@Get("/register/submit")
	async submitRegister(@Request() request: globalThis.Request) {
		const url = new URL(request.url);
		const name = url.searchParams.get("name") ?? "";
		const email = url.searchParams.get("email") ?? "";
		const password = url.searchParams.get("password") ?? "";

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
				location: "/dashboard",
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
	@Get("/login/submit")
	async submitLogin(@Request() request: globalThis.Request) {
		const url = new URL(request.url);
		const email = url.searchParams.get("email") ?? "";
		const password = url.searchParams.get("password") ?? "";

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
				location: "/dashboard",
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
		return {
			title: "Dashboard",
			name: user!.name,
			email: user!.email,
		};
	}

	// --- Logout ---

	@Hidden()
	@Get("/logout")
	logout() {
		return new Response(null, {
			status: 302,
			headers: {
				location: "/login",
				"set-cookie": clearCookieHeader(),
			},
		});
	}
}
