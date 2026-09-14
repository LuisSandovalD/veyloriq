import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/modules/identity/application/auth";
import { renderQuotePdf } from "@/modules/commerce/application/quote-pdf";
import { getDb } from "@/shared/database";
import { handleRouteError, jsonError, requestId } from "@/shared/http";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const requestIdentifier=requestId(request);try{const context=await requirePermission("quotes.read",request.headers.get("x-organization-id")??undefined);if(!context.ok)return jsonError(context.error,requestIdentifier);const {id}=await params;const quote=await getDb().quote.findUnique({where:{organizationId_id:{organizationId:context.value.organizationId,id}},include:{organization:true,customer:true,lines:true}});if(!quote)return jsonError({code:"NOT_FOUND",message:"Cotización no encontrada."},requestIdentifier);const pdf=await renderQuotePdf(quote);return new NextResponse(Buffer.from(pdf),{headers:{"content-type":"application/pdf","content-disposition":`inline; filename="${quote.number}.pdf"`,"cache-control":"private, no-store","x-request-id":requestIdentifier}})}catch(error){return handleRouteError(error,requestIdentifier)}}
