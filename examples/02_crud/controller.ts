import {
	Body,
	Controller,
	Delete,
	Description,
	Get,
	NotFoundException,
	Param,
	Patch,
	Post,
	Query,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";
import {
	CreateUser,
	ErrorResponse,
	ListQuery,
	UpdateUser,
	User,
	UserParams,
} from "./schemas.js";

// In-memory store for demo purposes
const users = new Map<string, { id: string; name: string; email: string; createdAt: string; }>();

@Route("/users")
@Tags("Users")
export class UserController extends Controller {
	@Get()
	@Summary("List users")
	@Description("Returns a paginated list of users, optionally filtered by search term")
	@Returns(200, [User], "List of users")
	list(@Query(ListQuery) query: ListQuery) {
		let results = [...users.values()];

		if (query.search) {
			const term = query.search.toLowerCase();
			results = results.filter(
				(u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
			);
		}

		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const start = (page - 1) * limit;

		return results.slice(start, start + limit);
	}

	@Get("/:id")
	@Summary("Get user by ID")
	@Returns(200, User, "The user")
	@Returns(404, ErrorResponse, "User not found")
	getById(@Param(UserParams) params: UserParams) {
		const user = users.get(params.id);
		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}

	@Post()
	@Summary("Create a new user")
	@Returns(201, User, "Created user")
	@Returns(400, ErrorResponse, "Validation error")
	create(@Body(CreateUser) body: CreateUser) {
		const id = crypto.randomUUID();
		const user = {
			id: id,
			name: body.name,
			email: body.email,
			createdAt: new Date().toISOString(),
		};
		users.set(id, user);
		this.setStatus(201);
		return user;
	}

	@Patch("/:id")
	@Summary("Update a user")
	@Returns(200, User, "Updated user")
	@Returns(404, ErrorResponse, "User not found")
	update(
		@Param(UserParams) params: UserParams,
		@Body(UpdateUser) body: UpdateUser,
	) {
		const user = users.get(params.id);
		if (!user) {
			throw new NotFoundException("User not found");
		}

		if (body.name !== undefined) user.name = body.name;
		if (body.email !== undefined) user.email = body.email;

		return user;
	}

	@Delete("/:id")
	@Summary("Delete a user")
	@Returns(204, undefined, "User deleted")
	@Returns(404, ErrorResponse, "User not found")
	remove(@Param(UserParams) params: UserParams) {
		if (!users.has(params.id)) {
			throw new NotFoundException("User not found");
		}

		users.delete(params.id);
		this.setStatus(204);
	}
}
