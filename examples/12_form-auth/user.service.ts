import { SignJWT, jwtVerify } from "jose";
import { Repository } from "typeorm";

import { Injectable } from "../../src/index.js";
import { AppDataSource } from "./data-source.js";
import { User } from "./entities/user.entity.js";

const JWT_SECRET = new TextEncoder().encode("demo-secret-change-in-production");
const JWT_ALGORITHM = "HS256";
const JWT_EXPIRY = "2h";

@Injectable()
export class UserService {
	#repo: Repository<User>;

	constructor() {
		this.#repo = AppDataSource.getRepository(User);
	}

	async register(name: string, email: string, password: string): Promise<{ token: string; error?: never } | { error: string; token?: never }> {
		const existing = await this.#repo.findOneBy({ email: email });
		if (existing) {
			return { error: "Email already registered" };
		}

		const passwordHash = await Bun.password.hash(password);
		const user = this.#repo.create({ name: name, email: email, passwordHash: passwordHash });
		await this.#repo.save(user);

		return { token: await this.#signToken(user.id) };
	}

	async login(email: string, password: string): Promise<{ token: string; error?: never } | { error: string; token?: never }> {
		const user = await this.#repo.findOneBy({ email: email });
		if (!user) {
			return { error: "Invalid email or password" };
		}

		const valid = await Bun.password.verify(password, user.passwordHash);
		if (!valid) {
			return { error: "Invalid email or password" };
		}

		return { token: await this.#signToken(user.id) };
	}

	async verifyToken(token: string): Promise<User | null> {
		try {
			const { payload } = await jwtVerify(token, JWT_SECRET, {
				algorithms: [JWT_ALGORITHM],
			});
			const userId = payload.sub as string | undefined;
			if (!userId) return null;
			return this.#repo.findOneBy({ id: userId });
		} catch {
			return null;
		}
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
