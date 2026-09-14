import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/modules/identity/application/auth";
import {
  encodeReport,
  loadReport,
  type ReportFormat,
  type ReportName,
} from "@/modules/reporting/application/report-export";
import { getDb } from "@/shared/database";
import { handleRouteError, jsonError, requestId } from "@/shared/http";
import { parseDateInTimeZone } from "@/shared/time-zone";

const reportSchema = z.enum([
  "sales",
  "quotes",
  "inventory",
  "purchases",
  "cashflow",
  "collections",
  "expenses",
  "receivables",
  "payables",
  "customers",
  "opportunities",
  "products",
  "valuation",
  "subscriptions",
  "usage",
]);
const formatSchema = z.enum(["json", "csv", "xlsx", "pdf"]);

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission(
      "reports.read",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const jobId = request.nextUrl.searchParams.get("jobId");
    if (jobId) {
      const job = await getDb().job.findFirst({
        where: {
          id: jobId,
          organizationId: context.value.organizationId,
          type: "report.export",
        },
        select: {
          id: true,
          status: true,
          payload: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!job)
        return jsonError(
          { code: "NOT_FOUND", message: "Exportación no encontrada." },
          id,
        );
      const payload = job.payload as Record<string, unknown>;
      return NextResponse.json(
        {
          id: job.id,
          status: job.status,
          lastError: job.lastError,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          documentId: payload.resultDocumentId ?? null,
        },
        {
          headers: { "x-request-id": id, "cache-control": "private, no-store" },
        },
      );
    }

    const report = reportSchema.parse(
      request.nextUrl.searchParams.get("report"),
    ) as ReportName;
    const format = formatSchema.parse(
      request.nextUrl.searchParams.get("format") ?? "json",
    ) as ReportFormat;
    const organization = await getDb().organization.findUniqueOrThrow({
      where: { id: context.value.organizationId },
      select: { timeZone: true },
    });
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = `${today.slice(0, 8)}01`;
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const fromDate = dateSchema.parse(
      request.nextUrl.searchParams.get("from") ?? firstDay,
    );
    const toDate = dateSchema.parse(
      request.nextUrl.searchParams.get("to") ?? today,
    );
    const from = parseDateInTimeZone(fromDate, organization.timeZone);
    const to = parseDateInTimeZone(toDate, organization.timeZone, true);
    if (from > to)
      return jsonError(
        { code: "VALIDATION", message: "El período es inválido." },
        id,
      );

    const result = await loadReport(
      context.value.organizationId,
      report,
      from,
      to,
      5001,
    );
    if (result.rows.length > 5000) {
      const job = await getDb().job.create({
        data: {
          organizationId: context.value.organizationId,
          type: "report.export",
          payload: {
            report,
            from: from.toISOString(),
            to: to.toISOString(),
            format,
            timeZone: organization.timeZone,
            actorId: context.value.userId,
          },
          correlationId: id,
        },
      });
      return NextResponse.json(
        { accepted: true, jobId: job.id },
        { status: 202, headers: { "x-request-id": id } },
      );
    }
    if (format === "json")
      return NextResponse.json(
        {
          definition: result.definition,
          period: {
            from: from.toISOString(),
            to: to.toISOString(),
            timeZone: organization.timeZone,
          },
          rows: result.rows,
        },
        {
          headers: { "x-request-id": id, "cache-control": "private, no-store" },
        },
      );

    const output = await encodeReport(
      result.rows,
      format,
      report,
      result.definition,
      from,
      to,
      organization.timeZone,
    );
    return new NextResponse(new Uint8Array(output.bytes), {
      headers: {
        "content-type": output.mimeType,
        "content-disposition": `attachment; filename="VEYLORIQ-${report}.${output.extension}"`,
        "cache-control": "private, no-store",
        "x-request-id": id,
      },
    });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
