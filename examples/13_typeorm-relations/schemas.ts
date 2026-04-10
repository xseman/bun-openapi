import { Type } from "class-transformer";
import {
	IsArray,
	IsBoolean,
	IsDateString,
	IsEmail,
	IsOptional,
	IsString,
	MinLength,
	ValidateNested,
} from "class-validator";

export class UserParams {
	@IsString()
	id!: string;
}

export class PostParams {
	@IsString()
	postId!: string;
}

export class UserPostParams {
	@IsString()
	id!: string;

	@IsString()
	postId!: string;
}

export class CreateUserBody {
	@IsString()
	@MinLength(1)
	name!: string;

	@IsEmail()
	email!: string;
}

export class CreatePostBody {
	@IsString()
	@MinLength(1)
	title!: string;

	@IsString()
	@MinLength(1)
	body!: string;
}

export class UpdatePostBody {
	@IsOptional()
	@IsString()
	@MinLength(1)
	title?: string;

	@IsOptional()
	@IsString()
	@MinLength(1)
	body?: string;

	@IsOptional()
	@IsBoolean()
	published?: boolean;
}

export class UserDto {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsEmail()
	email!: string;

	@IsDateString()
	createdAt!: string;
}

export class PostDto {
	@IsString()
	id!: string;

	@IsString()
	title!: string;

	@IsString()
	body!: string;

	@IsBoolean()
	published!: boolean;

	@IsDateString()
	createdAt!: string;

	@IsString()
	authorId!: string;
}

export class UserWithPostsDto extends UserDto {
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PostDto)
	posts!: PostDto[];
}

export class ErrorResponse {
	@IsString()
	message!: string;
}
