import {
	IsArray,
	IsDateString,
	IsString,
	MinLength,
} from "class-validator";
import {
	Body,
	Controller,
	Get,
	Post,
	Returns,
	Route,
	Security,
	Summary,
	Tags,
} from "../../src/index.js";

class AdminInfo {
	@IsString()
	role!: string;

	@IsArray()
	@IsString({ each: true })
	permissions!: string[];
}

class AuditLog {
	@IsString()
	id!: string;

	@IsString()
	action!: string;

	@IsDateString()
	timestamp!: string;

	@IsString()
	userId!: string;
}

class CreateAuditLog {
	@IsString()
	@MinLength(1)
	action!: string;

	@IsString()
	userId!: string;
}

@Route("/admin")
@Tags("Admin")
@Security("bearerAuth")
class AdminController extends Controller {
	@Get("/info")
	@Summary("Get admin info")
	@Returns(200, AdminInfo, "Admin information")
	info() {
		return {
			role: "admin",
			permissions: ["read", "write", "delete"],
		};
	}

	@Get("/audit")
	@Summary("Get audit logs")
	@Returns(200, [AuditLog], "List of audit logs")
	audit() {
		return [];
	}

	@Post("/audit")
	@Summary("Create audit log entry")
	@Returns(201, AuditLog, "Created audit log")
	createAudit(@Body(CreateAuditLog) body: CreateAuditLog) {
		this.setStatus(201);
		return {
			id: crypto.randomUUID(),
			action: body.action,
			userId: body.userId,
			timestamp: new Date().toISOString(),
		};
	}
}

export { AdminController };
