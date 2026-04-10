import { IsDateString, IsEmail, IsString, MinLength } from "class-validator";

export class RegisterBody {
	@IsEmail()
	email!: string;

	@IsString()
	@MinLength(8)
	password!: string;
}

export class LoginBody {
	@IsEmail()
	email!: string;

	@IsString()
	password!: string;
}

export class MeResponse {
	@IsString()
	id!: string;

	@IsEmail()
	email!: string;

	@IsDateString()
	createdAt!: string;
}

export class MessageResponse {
	@IsString()
	message!: string;
}

export class ErrorResponse {
	@IsString()
	message!: string;
}
