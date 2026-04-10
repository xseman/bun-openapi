import {
	Body,
	Controller,
	Delete,
	Description,
	Get,
	Param,
	Patch,
	Post,
	Returns,
	Route,
	Summary,
	Tags,
} from "../../src/index.js";
import {
	CreatePostBody,
	CreateUserBody,
	ErrorResponse,
	PostDto,
	UpdatePostBody,
	UserDto,
	UserParams,
	UserPostParams,
	UserWithPostsDto,
} from "./schemas.js";
import { UserService } from "./user.service.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toUserDto(user: { id: string; name: string; email: string; createdAt: Date; }): UserDto {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		createdAt: user.createdAt.toISOString(),
	};
}

function toPostDto(post: { id: string; title: string; body: string; published: boolean; createdAt: Date; authorId: string; }): PostDto {
	return {
		id: post.id,
		title: post.title,
		body: post.body,
		published: post.published,
		createdAt: post.createdAt.toISOString(),
		authorId: post.authorId,
	};
}

// ---------------------------------------------------------------------------
// UsersController
// ---------------------------------------------------------------------------

@Route("/users")
@Tags("Users")
export class UsersController extends Controller {
	constructor(private readonly userService: UserService) {
		super();
	}

	@Get()
	@Summary("List all users")
	@Returns(200, [UserDto], "Users list")
	async list() {
		const users = await this.userService.findAllUsers();
		return users.map(toUserDto);
	}

	@Post()
	@Summary("Create a user")
	@Returns(201, UserDto, "Created user")
	@Returns(400, ErrorResponse, "Validation error")
	async create(@Body(CreateUserBody) body: CreateUserBody) {
		const user = await this.userService.createUser(body.name, body.email);
		this.setStatus(201);
		return toUserDto(user);
	}

	@Get("/:id")
	@Summary("Get user with their posts")
	@Description("Returns the user and all posts authored by them (one-to-many eager load)")
	@Returns(200, UserWithPostsDto, "User with posts")
	@Returns(404, ErrorResponse, "User not found")
	async getWithPosts(@Param(UserParams) params: UserParams) {
		const user = await this.userService.findUserWithPosts(params.id);
		return {
			...toUserDto(user),
			posts: user.posts.map(toPostDto),
		};
	}
}

// ---------------------------------------------------------------------------
// PostsController — nested under /users/:id/posts
// ---------------------------------------------------------------------------

@Route("/users/:id/posts")
@Tags("Posts")
export class PostsController extends Controller {
	constructor(private readonly userService: UserService) {
		super();
	}

	@Get()
	@Summary("List posts by user")
	@Returns(200, [PostDto], "Posts list")
	@Returns(404, ErrorResponse, "User not found")
	async list(@Param(UserParams) params: UserParams) {
		const posts = await this.userService.findPostsByUser(params.id);
		return posts.map(toPostDto);
	}

	@Post()
	@Summary("Create a post for a user")
	@Returns(201, PostDto, "Created post")
	@Returns(404, ErrorResponse, "User not found")
	async create(
		@Param(UserParams) params: UserParams,
		@Body(CreatePostBody) body: CreatePostBody,
	) {
		const post = await this.userService.createPost(params.id, body.title, body.body);
		this.setStatus(201);
		return toPostDto(post);
	}

	@Patch("/:postId")
	@Summary("Update a post")
	@Returns(200, PostDto, "Updated post")
	@Returns(404, ErrorResponse, "Post not found")
	async update(
		@Param(UserPostParams) params: UserPostParams,
		@Body(UpdatePostBody) body: UpdatePostBody,
	) {
		const post = await this.userService.updatePost(params.id, params.postId, body);
		return toPostDto(post);
	}

	@Delete("/:postId")
	@Summary("Delete a post")
	@Returns(204, undefined, "Post deleted")
	@Returns(404, ErrorResponse, "Post not found")
	async remove(@Param(UserPostParams) params: UserPostParams) {
		await this.userService.deletePost(params.id, params.postId);
		this.setStatus(204);
	}
}

// ---------------------------------------------------------------------------
// PublishedController — cross-user feed of published posts
// ---------------------------------------------------------------------------

@Route("/posts")
@Tags("Feed")
export class PublishedController extends Controller {
	constructor(private readonly userService: UserService) {
		super();
	}

	@Get("/published")
	@Summary("List all published posts")
	@Description("Returns published posts across all users, ordered newest first. Demonstrates a join query with author relation.")
	@Returns(200, [PostDto], "Published posts")
	async published() {
		const posts = await this.userService.findPublishedPosts();
		return posts.map(toPostDto);
	}
}
