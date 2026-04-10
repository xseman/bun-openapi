import { rateLimit } from "decorator-toolkit/rate-limit/legacy";
import {
	DataSource,
	Repository,
} from "typeorm";

import {
	ConflictException,
	Injectable,
	UnauthorizedException,
} from "../../src/index.js";
import { User } from "./entities/user.entity.js";

@Injectable()
export class AuthService {
	#repo: Repository<User>;

	constructor(dataSource: DataSource) {
		this.#repo = dataSource.getRepository(User);
	}

	@rateLimit<AuthService, [string, string]>({
		allowedCalls: 5,
		timeSpanMs: 60_000,
		keyResolver: (_email, _password) => "register",
	})
	async register(email: string, password: string): Promise<User> {
		const existing = await this.#repo.findOneBy({ email: email });
		if (existing) {
			throw new ConflictException("Email already registered");
		}

		const passwordHash = await Bun.password.hash(password);
		const user = this.#repo.create({ email: email, passwordHash: passwordHash });
		return this.#repo.save(user);
	}

	@rateLimit<AuthService, [string, string]>({
		allowedCalls: 10,
		timeSpanMs: 60_000,
		keyResolver: (email) => email,
	})
	async login(email: string, password: string): Promise<User> {
		const user = await this.#repo.findOneBy({ email: email });
		if (!user) {
			throw new UnauthorizedException("Invalid credentials");
		}

		const valid = await Bun.password.verify(password, user.passwordHash);
		if (!valid) {
			throw new UnauthorizedException("Invalid credentials");
		}

		return user;
	}

	async findById(id: string): Promise<User | null> {
		return this.#repo.findOneBy({ id: id });
	}
}
