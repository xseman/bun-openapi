import {
	Body,
	Controller,
	Delete,
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
	ListUsersQuery,
	UpdateUser,
	User,
	UserParams,
} from "./models.js";

const users = new Map<string, User>();

@Route("/users")
@Tags("Users")
export class UserController extends Controller {
	@Get()
	@Summary("List users")
	@Returns(200, [User], "List of users")
	list(@Query(ListUsersQuery) query: ListUsersQuery) {
		let results = [...users.values()];

		if (query.search) {
			const term = query.search.toLowerCase();
			results = results.filter(
				(user) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
			);
		}

		return results;
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
		const user = Object.assign(new User(), {
			id: crypto.randomUUID(),
			name: body.name,
			email: body.email,
			createdAt: new Date().toISOString(),
		});
		users.set(user.id, user);
		this.setStatus(201);
		return user;
	}

	@Patch("/:id")
	@Summary("Update a user")
	@Returns(200, User, "Updated user")
	@Returns(404, ErrorResponse, "User not found")
	update(@Param(UserParams) params: UserParams, @Body(UpdateUser) body: UpdateUser) {
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
		return undefined;
	}
}
