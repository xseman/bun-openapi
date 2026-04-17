import {
	IsEmail,
	IsString,
	MinLength,
} from "class-validator";
import {
	Body,
	Controller,
	Injectable,
	Middleware,
	Module,
	Post,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";
import {
	DatabaseModule,
	DatabaseService,
} from "./database.module.js";
import { rateLimiter } from "./server.js";

// --- Services ---

@Injectable()
export class JwtService {
	sign(_payload: object) {
		return "token";
	}

	verify(_token: string) {
		return {};
	}
}

@Injectable()
export class AuthService {
	constructor(
		private readonly db: DatabaseService,
		private readonly jwt: JwtService,
	) {}

	login(_email: string, _password: string) {
		void this.db;
		return { token: this.jwt.sign({ sub: "1" }) };
	}

	register(_email: string, _password: string) {
		return { id: "1" };
	}
}

// --- Controller ---

class LoginBody {
	@IsEmail()
	email!: string;

	@IsString()
	@MinLength(1)
	password!: string;
}

class TokenResponse {
	@IsString()
	token!: string;
}

class MessageResponse {
	@IsString()
	message!: string;
}

@Route("/auth")
@Tags("Auth")
@Middleware(rateLimiter)
export class AuthController extends Controller {
	constructor(
		private readonly authService: AuthService,
	) {
		super();
	}

	@Post("/login")
	@Summary("Login with email and password")
	@Returns(200, TokenResponse, "JWT token")
	login(@Body(LoginBody) body: { email: string; password: string; }) {
		return this.authService.login(body.email, body.password);
	}

	@Post("/register")
	@Summary("Register a new account")
	@Returns(201, MessageResponse, "Created")
	register(@Body(LoginBody) body: { email: string; password: string; }) {
		void this.authService.register(body.email, body.password);
		this.setStatus(201);
		return { message: "Created" };
	}

	@Post("/logout")
	@Summary("Logout and invalidate session")
	@Returns(204, undefined, "No content")
	logout() {}
}

// --- Module ---

@Module({
	imports: [DatabaseModule],
	controllers: [AuthController],
	providers: [AuthService, JwtService],
	exports: [AuthService],
})
export class AuthModule {}
