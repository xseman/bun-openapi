import {
	IsDateString,
	IsEmail,
	IsString,
	MinLength,
} from "class-validator";

import {
	Body,
	Controller,
	Get,
	Inject,
	Param,
	Post,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";
import { UserService } from "./service.js";

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

class User {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsEmail()
	email!: string;

	@IsDateString()
	createdAt!: string;
}

class ErrorResponse {
	@IsString()
	message!: string;
}

@Route("/users")
@Tags("Users")
export class UserController extends Controller {
	constructor(
		private readonly userService: UserService,
		@Inject("APP_NAME") private readonly appName: string,
	) {
		super();
	}

	@Get()
	@Summary("List all users")
	@Returns(200, [User], "List of users")
	list() {
		return this.userService.findAll();
	}

	@Get("/:id")
	@Summary("Get user by ID")
	@Returns(200, User, "The user")
	@Returns(404, ErrorResponse, "Not found")
	async getById(
		@Param(UserParams) params: UserParams,
	) {
		const user = await this.userService.findById(params.id);
		if (!user) {
			this.setStatus(404);
			return { message: "User not found" };
		}

		return user;
	}

	@Post()
	@Summary("Create user")
	@Returns(201, User, "Created user")
	create(
		@Body(CreateUser) body: CreateUser,
	) {
		const user = this.userService.create(body);
		void this.appName;
		this.setStatus(201);
		return user;
	}
}
