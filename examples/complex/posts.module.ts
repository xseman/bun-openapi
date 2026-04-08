import {
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
	Middleware,
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
import { rateLimiter } from "./server.js";
import {
	UsersModule,
	UsersService,
} from "./users.module.js";

// --- Service ---

@Injectable()
export class PostsService {
	constructor(
		private readonly db: DatabaseService,
		private readonly usersService: UsersService,
	) {}

	findAll() {
		void this.db;
		void this.usersService;
		return [];
	}

	findById(_id: string) {
		return null;
	}

	create(_data: { title: string; body: string; authorId: string; }) {
		return { id: "1" };
	}

	update(_id: string, _data: object) {
		return {};
	}

	remove(_id: string) {}
}

// --- Middleware ---

function validateOwnership(_req: Request, next: () => Promise<Response>) {
	return next();
}

// --- Controller ---
class PostParams {
	@IsString()
	id!: string;
}

class CreatePost {
	@IsString()
	@MinLength(1)
	title!: string;

	@IsString()
	@MinLength(1)
	body!: string;

	@IsString()
	authorId!: string;
}

class UpdatePost {
	@IsOptional()
	@IsString()
	@MinLength(1)
	title?: string;

	@IsOptional()
	@IsString()
	@MinLength(1)
	body?: string;

	@IsOptional()
	@IsString()
	authorId?: string;
}

class PostRecord {
	@IsString()
	id!: string;

	@IsString()
	title!: string;

	@IsString()
	body!: string;
}

class ErrorResponse {
	@IsString()
	message!: string;
}

@Route("/posts")
@Tags("Posts")
@Middleware(rateLimiter)
export class PostsController extends Controller {
	constructor(private readonly postsService: PostsService) {
		super();
	}

	@Get()
	@Summary("List all posts")
	@Returns(200, [PostRecord], "Posts list")
	list() {
		return this.postsService.findAll();
	}

	@Get("/:id")
	@Summary("Get post by ID")
	@Returns(200, PostRecord, "The post")
	@Returns(404, ErrorResponse, "Not found")
	getById(@Param(PostParams) params: PostParams) {
		const post = this.postsService.findById(params.id);
		if (!post) {
			throw new NotFoundException("Post not found");
		}

		return post;
	}

	@Post()
	@Middleware(validateOwnership)
	@Summary("Create post")
	@Returns(201, PostRecord, "Created post")
	create(@Body(CreatePost) body: CreatePost) {
		this.setStatus(201);
		return {
			id: crypto.randomUUID(),
			title: body.title,
			body: body.body,
		};
	}

	@Put("/:id")
	@Middleware(validateOwnership)
	@Summary("Update post")
	@Returns(200, PostRecord, "Updated post")
	update(
		@Param(PostParams) params: PostParams,
		@Body(UpdatePost) body: UpdatePost,
	) {
		return {
			id: params.id,
			title: body.title ?? "Updated title",
			body: body.body ?? "Updated body",
		};
	}

	@Delete("/:id")
	@Summary("Delete post")
	@Returns(204, undefined, "Deleted")
	remove(@Param(PostParams) params: PostParams) {
		this.postsService.remove(params.id);
		this.setStatus(204);
		return undefined;
	}
}

// --- Module ---

@Module({
	imports: [UsersModule, DatabaseModule],
	controllers: [PostsController],
	providers: [PostsService],
})
export class PostsModule {}
