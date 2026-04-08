import {
	IsEmail,
	IsISO8601,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from "class-validator";

export class UserParams {
	@IsString()
	id!: string;
}

export class ListUsersQuery {
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(255)
	search?: string;
}

export class CreateUser {
	@IsString()
	@MinLength(1)
	name!: string;

	@IsEmail()
	email!: string;
}

export class UpdateUser {
	@IsOptional()
	@IsString()
	@MinLength(1)
	name?: string;

	@IsOptional()
	@IsEmail()
	email?: string;
}

export class User {
	@IsString()
	id!: string;

	@IsString()
	name!: string;

	@IsEmail()
	email!: string;

	@IsISO8601()
	createdAt!: string;
}

export class ErrorResponse {
	@IsString()
	message!: string;
}
