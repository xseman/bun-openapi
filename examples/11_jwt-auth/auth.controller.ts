import {
	Body,
	Controller,
	Get,
	Post,
	Request,
	Returns,
	Route,
	Security,
	Summary,
	Tags,
} from "../../src/index.js";
import { AuthService } from "./auth.service.js";
import {
	ErrorResponse,
	LoginBody,
	MeResponse,
	RegisterBody,
	TokenResponse,
} from "./schemas.js";

@Route("/auth")
@Tags("Auth")
export class AuthController extends Controller {
	constructor(private readonly authService: AuthService) {
		super();
	}

	@Post("/register")
	@Summary("Register a new account")
	@Returns(201, TokenResponse, "JWT token")
	@Returns(400, ErrorResponse, "Validation error")
	@Returns(409, ErrorResponse, "Email already registered")
	async register(@Body(RegisterBody) body: RegisterBody) {
		const token = await this.authService.register(body.email, body.password);
		this.setStatus(201);
		return { token: token };
	}

	@Post("/login")
	@Summary("Login with email and password")
	@Returns(200, TokenResponse, "JWT token")
	@Returns(401, ErrorResponse, "Invalid credentials")
	async login(@Body(LoginBody) body: LoginBody) {
		const token = await this.authService.login(body.email, body.password);
		return { token: token };
	}

	@Get("/me")
	@Summary("Get the authenticated user profile")
	@Security("bearerAuth")
	@Returns(200, MeResponse, "Authenticated user")
	@Returns(401, ErrorResponse, "Unauthorized")
	async me(@Request() req: Request) {
		const [, token] = req.headers.get("authorization")?.split(" ") ?? [];
		const userId = await this.authService.verifyToken(token ?? "");
		const user = userId ? await this.authService.findById(userId) : null;
		return {
			id: user!.id,
			email: user!.email,
			createdAt: user!.createdAt.toISOString(),
		};
	}
}
