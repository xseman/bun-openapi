import {
	type CanActivate,
	Controller,
	Get,
	Hidden,
	Injectable,
	Render,
	Request,
	Route,
	UseGuards,
} from "../../src/index.js";
import { AuthService } from "./auth.service.js";
import { SessionStore } from "./session-store.js";

const COOKIE_NAME = "sid";

function sidFromCookie(request: globalThis.Request): string | null {
	const cookieHeader = request.headers.get("cookie") ?? "";
	for (const part of cookieHeader.split(";")) {
		const trimmed = part.trim();
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		if (trimmed.slice(0, eq) === COOKIE_NAME) {
			return trimmed.slice(eq + 1) || null;
		}
	}
	return null;
}

function setCookieHeader(sessionId: string): string {
	return `${COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`;
}

function clearCookieHeader(): string {
	return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

// ---------------------------------------------------------------------------
// Guard — validates the sid cookie and redirects to /login if missing/expired
// ---------------------------------------------------------------------------

@Injectable()
export class SessionGuard implements CanActivate {
	constructor(private readonly sessions: SessionStore) {}

	canActivate({ request }: { request: globalThis.Request; }) {
		const sid = sidFromCookie(request);
		if (!sid) {
			return Response.redirect("/login", 302);
		}

		const userId = this.sessions.get(sid);
		if (!userId) {
			return Response.redirect("/login", 302);
		}

		return true;
	}
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Route("/")
export class AuthController extends Controller {
	constructor(
		private readonly authService: AuthService,
		private readonly sessions: SessionStore,
	) {
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
		const email = url.searchParams.get("email") ?? "";
		const password = url.searchParams.get("password") ?? "";

		try {
			const user = await this.authService.register(email, password);
			const sid = this.sessions.create(user.id);
			return new Response(null, {
				status: 302,
				headers: {
					"location": "/dashboard",
					"set-cookie": setCookieHeader(sid),
				},
			});
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Registration failed";
			return new Response(null, {
				status: 302,
				headers: { location: `/register?error=${encodeURIComponent(msg)}` },
			});
		}
	}

	// --- Login ---

	@Get("/login")
	@Render("login")
	showLogin() {
		return { title: "Sign in" };
	}

	@Hidden()
	@Get("/login/submit")
	async submitLogin(@Request() request: globalThis.Request) {
		const url = new URL(request.url);
		const email = url.searchParams.get("email") ?? "";
		const password = url.searchParams.get("password") ?? "";

		try {
			const user = await this.authService.login(email, password);
			const sid = this.sessions.create(user.id);
			return new Response(null, {
				status: 302,
				headers: {
					"location": "/dashboard",
					"set-cookie": setCookieHeader(sid),
				},
			});
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Login failed";
			return new Response(null, {
				status: 302,
				headers: { location: `/login?error=${encodeURIComponent(msg)}` },
			});
		}
	}

	// --- Dashboard (protected) ---

	@Get("/dashboard")
	@UseGuards(SessionGuard)
	@Render("dashboard")
	async dashboard(@Request() request: globalThis.Request) {
		const sid = sidFromCookie(request)!;
		const userId = this.sessions.get(sid)!;
		const user = await this.authService.findById(userId);
		return {
			title: "Dashboard",
			email: user!.email,
		};
	}

	// --- Logout ---

	@Hidden()
	@Get("/logout")
	logout(@Request() request: globalThis.Request) {
		const sid = sidFromCookie(request);
		if (sid) this.sessions.destroy(sid);
		return new Response(null, {
			status: 302,
			headers: {
				"location": "/login",
				"set-cookie": clearCookieHeader(),
			},
		});
	}
}
