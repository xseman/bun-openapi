import {
	IsBoolean,
	IsDateString,
	IsNumber,
	IsOptional,
	IsString,
} from "class-validator";
import {
	Controller,
	Get,
	Injectable,
	type Interceptor,
	Produces,
	Query,
	Returns,
	Route,
	Summary,
	Tags,
	UseInterceptors,
} from "../../src/index.js";

class SummaryData {
	@IsNumber()
	open!: number;

	@IsNumber()
	closed!: number;
}

class SummaryMeta {
	@IsDateString()
	generatedAt!: string;

	@IsString()
	handler!: string;
}

class SummaryEnvelope {
	data!: SummaryData;
	meta!: SummaryMeta;
}

class ExportQuery {
	@IsOptional()
	@IsBoolean()
	cached?: boolean;
}

@Injectable()
class EnvelopeInterceptor implements Interceptor {
	async intercept(ctx: any, next: () => Promise<unknown>) {
		return {
			data: await next(),
			meta: {
				generatedAt: new Date().toISOString(),
				handler: ctx.handlerName,
			},
		};
	}
}

@Injectable()
class CachedCsvInterceptor implements Interceptor {
	intercept(ctx: any, next: () => Promise<unknown>) {
		const cached = ctx.query.cached as boolean | string | string[] | undefined;

		if (cached === true || cached === "true" || cached === "1") {
			return new Response("id,status\n1,open\n2,closed", {
				status: 200,
				headers: {
					"content-type": "text/csv; charset=utf-8",
					"x-cache": "hit",
				},
			});
		}

		return next();
	}
}

@Route("/reports")
@Tags("Reports")
@UseInterceptors(EnvelopeInterceptor)
class ReportsController extends Controller {
	@Get("/summary")
	@Summary("Get a summary report")
	@Returns(200, SummaryEnvelope, "Summary report")
	handleSummary() {
		return {
			open: 12,
			closed: 4,
		};
	}

	@Get("/export")
	@Summary("Export report as CSV")
	@Produces("text/csv")
	@Returns(200, { type: "string" }, "CSV export")
	@UseInterceptors(CachedCsvInterceptor)
	handleExport(@Query(ExportQuery) _query: ExportQuery) {
		return "id,status\n3,open\n4,closed";
	}
}

export { CachedCsvInterceptor, EnvelopeInterceptor, ReportsController };
