import {
	IsDateString,
	IsEmail,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
	MinLength,
} from "class-validator";

export class ErrorResponse {
	@IsString()
	message!: string;
}

export class User {
	@IsString()
	id!: string;

	@IsString()
	@MinLength(1)
	name!: string;

	@IsEmail()
	email!: string;

	@IsDateString()
	createdAt!: string;
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

export class UserParams {
	@IsString()
	id!: string;
}

export class ListQuery {
	@IsOptional()
	@IsNumber()
	@Min(1)
	page?: number;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	limit?: number;

	@IsOptional()
	@IsString()
	search?: string;
}
