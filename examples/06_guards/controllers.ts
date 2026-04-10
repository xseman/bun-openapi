import {
	IsArray,
	IsBoolean,
	IsDateString,
	IsString,
	MinLength,
} from "class-validator";
import {
	Body,
	type CanActivate,
	Controller,
	ForbiddenException,
	Get,
	Injectable,
	Post,
	Returns,
	Route,
	Security,
	Summary,
	Tags,
	UseGuards,
} from "../../src/index.js";

// ---------------------------------------------------------------------------
// DTOs — ProjectController
// ---------------------------------------------------------------------------

class SummaryResponse {
	@IsString()
	project!: string;

	@IsString()
	status!: string;
}

class DraftResponse {
	@IsString()
	id!: string;

	@IsString()
	title!: string;
}

class PublishResponse {
	@IsBoolean()
	published!: boolean;

	@IsDateString()
	at!: string;
}

// ---------------------------------------------------------------------------
// DTOs — AdminController
// ---------------------------------------------------------------------------

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

class ErrorResponse {
	@IsString()
	message!: string;
}

// ---------------------------------------------------------------------------
// Guards — method-level access control
// ---------------------------------------------------------------------------

@Injectable()
class EditorRoleGuard implements CanActivate {
	canActivate({ request }: { request: Request; }) {
		const currentRole = request.headers.get("x-role");
		return currentRole === "editor" || currentRole === "admin";
	}
}

@Injectable()
class PreviewAvailabilityGuard implements CanActivate {
	canActivate({ request }: { request: Request; }) {
		if (request.headers.get("x-preview-block") === "1") {
			return new Response("Preview temporarily unavailable", {
				status: 429,
				headers: { "retry-after": "30" },
			});
		}

		return true;
	}
}

@Injectable()
class AdminPublishGuard implements CanActivate {
	canActivate({ request }: { request: Request; }) {
		if (request.headers.get("x-role") !== "admin") {
			throw new ForbiddenException("Admin role required to publish");
		}

		return true;
	}
}

// ---------------------------------------------------------------------------
// ProjectController — demonstrates method-level @UseGuards with varied return types
// ---------------------------------------------------------------------------

@Route("/projects")
@Tags("Projects")
@Security("bearerAuth")
class ProjectController extends Controller {
	@Get("/summary")
	@Summary("Get a project summary")
	@Returns(200, SummaryResponse, "Project summary")
	summary() {
		return {
			project: "bun-openapi",
			status: "active",
		};
	}

	@Get("/drafts")
	@UseGuards(EditorRoleGuard, PreviewAvailabilityGuard)
	@Summary("List editable drafts (editor or admin role required)")
	@Returns(200, [DraftResponse], "Draft list")
	@Returns(403, ErrorResponse, "Editor role required")
	drafts() {
		return [
			{ id: "1", title: "Release notes" },
			{ id: "2", title: "Architecture RFC" },
		];
	}

	@Post("/publish")
	@UseGuards(AdminPublishGuard)
	@Summary("Publish the current draft set (admin role required)")
	@Returns(200, PublishResponse, "Published")
	@Returns(403, ErrorResponse, "Admin role required")
	publish() {
		return {
			published: true,
			at: new Date().toISOString(),
		};
	}
}

// ---------------------------------------------------------------------------
// AdminController — demonstrates class-level @Security applied to all endpoints
// ---------------------------------------------------------------------------

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

export { AdminController, AdminPublishGuard, EditorRoleGuard, PreviewAvailabilityGuard, ProjectController };
