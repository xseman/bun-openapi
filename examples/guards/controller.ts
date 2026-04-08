import {
	IsArray,
	IsBoolean,
	IsDateString,
	IsString,
} from "class-validator";

import {
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

class ErrorResponse {
	@IsString()
	message!: string;
}

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
	@Summary("List editable drafts")
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
	@Summary("Publish the current draft set")
	@Returns(200, PublishResponse, "Published")
	@Returns(403, ErrorResponse, "Admin role required")
	publish() {
		return {
			published: true,
			at: new Date().toISOString(),
		};
	}
}

export { AdminPublishGuard, EditorRoleGuard, PreviewAvailabilityGuard, ProjectController };
