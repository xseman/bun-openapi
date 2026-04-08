import {
	IsEmail,
	IsOptional,
	IsString,
	MinLength,
} from "class-validator";
import {
	Body,
	Controller,
	Delete,
	Get,
	Injectable,
	Module,
	NotFoundException,
	Param,
	Post,
	Put,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";
import {
	DatabaseModule,
	DatabaseService,
} from "./database.module.js";

// --- Service ---

@Injectable()
export class UsersService {
	constructor(private readonly db: DatabaseService) {}

	findAll() {
		void this.db;
		return [];
	}

	findById(_id: string) {
		return null;
	}

	create(_data: { name: string; email: string; }) {
		return { id: "1" };
	}

	update(_id: string, _data: object) {
		return {};
	}

	remove(_id: string) {}
}

// --- Controller ---

class UserParams {
	@IsString()
	id!: string;
}

class CreateUser {
	@IsString()
	@MinLength(1)
	name!: string;

	@IsEmail()
	email!: string;
}

class UpdateUser {
	@IsOptional()
	@IsString()
	@MinLength(1)
	name?: string;

	@IsOptional()
	@IsEmail()
	email?: string;
}

class User {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsEmail()
	email!: string;
}

class ErrorResponse {
	@IsString()
	message!: string;
}

@Route("/users")
@Tags("Users")
export class UsersController extends Controller {
	constructor(private readonly usersService: UsersService) {
		super();
	}

	@Get()
	@Summary("List all users")
	@Returns(200, [User], "Users list")
	list() {
		return this.usersService.findAll();
	}

	@Get("/:id")
	@Summary("Get user by ID")
	@Returns(200, User, "The user")
	@Returns(404, ErrorResponse, "Not found")
	getById(@Param(UserParams) params: UserParams) {
		const user = this.usersService.findById(params.id);
		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}

	@Post()
	@Summary("Create user")
	@Returns(201, User, "Created user")
	create(@Body(CreateUser) body: CreateUser) {
		this.setStatus(201);
		return {
			id: crypto.randomUUID(),
			name: body.name,
			email: body.email,
		};
	}

	@Put("/:id")
	@Summary("Update user")
	@Returns(200, User, "Updated user")
	update(
		@Param(UserParams) params: UserParams,
		@Body(UpdateUser) body: UpdateUser,
	) {
		return {
			id: params.id,
			name: body.name ?? "Updated user",
			email: body.email ?? "updated@example.com",
		};
	}

	@Delete("/:id")
	@Summary("Delete user")
	@Returns(204, undefined, "Deleted")
	remove(@Param(UserParams) params: UserParams) {
		this.usersService.remove(params.id);
		this.setStatus(204);
		return undefined;
	}
}

// --- Module ---

@Module({
	imports: [DatabaseModule],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService],
})
export class UsersModule {}
