import { cacheAsync } from "decorator-toolkit/cache-async/legacy";
import { rateLimit } from "decorator-toolkit/rate-limit/legacy";
import { timeout } from "decorator-toolkit/timeout/legacy";
import { SignJWT, jwtVerify } from "jose";
import { Repository } from "typeorm";

import { ConflictException, Injectable, UnauthorizedException } from "../../src/index.js";
import { AppDataSource } from "./data-source.js";
import { User } from "./entities/user.entity.js";

const JWT_SECRET = new TextEncoder().encode("demo-secret-change-in-production");
const JWT_ALGORITHM = "HS256";
const JWT_EXPIRY = "1h";

@Injectable()
export class AuthService {
	#repo: Repository<User>;

	constructor() {
		this.#repo = AppDataSource.getRepository(User);
	}

	// Limit registration attempts: max 5 per IP per minute
	@rateLimit<AuthService, [string, string]>({
		allowedCalls: 5,
		timeSpanMs: 60_000,
		keyResolver: (_email, _password) => "register",
	})
	async register(email: string, password: string): Promise<string> {
		const existing = await this.#repo.findOneBy({ email: email });
		if (existing) {
			throw new ConflictException("Email already registered");
		}

		const passwordHash = await Bun.password.hash(password);
		const user = this.#repo.create({ email: email, passwordHash: passwordHash });
		await this.#repo.save(user);

		return this.#signToken(user.id);
	}

	// Limit login attempts: max 10 per minute globally
	@rateLimit<AuthService, [string, string]>({
		allowedCalls: 10,
		timeSpanMs: 60_000,
		keyResolver: (email) => email,
	})
	async login(email: string, password: string): Promise<string> {
		const user = await this.#repo.findOneBy({ email: email });
		if (!user) {
			throw new UnauthorizedException("Invalid credentials");
		}

		const valid = await Bun.password.verify(password, user.passwordHash);
		if (!valid) {
			throw new UnauthorizedException("Invalid credentials");
		}

		return this.#signToken(user.id);
	}

	// JWT verification should be fast; abort if it takes over 500ms
	@timeout(500)
	async verifyToken(token: string): Promise<string | null> {
		try {
			const { payload } = await jwtVerify(token, JWT_SECRET, {
				algorithms: [JWT_ALGORITHM],
			});
			return (payload.sub as string) ?? null;
		} catch {
			return null;
		}
	}

	// Cache repeated profile lookups for the same user ID for 30s
	@cacheAsync({ ttlMs: 30_000 })
	async findById(id: string): Promise<User | null> {
		return this.#repo.findOneBy({ id: id });
	}

	async #signToken(userId: string): Promise<string> {
		return new SignJWT({})
			.setProtectedHeader({ alg: JWT_ALGORITHM })
			.setSubject(userId)
			.setIssuedAt()
			.setExpirationTime(JWT_EXPIRY)
			.sign(JWT_SECRET);
	}
}
