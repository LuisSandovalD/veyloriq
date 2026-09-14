import { NextResponse,type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/shared/database";
import { assertSameOrigin,handleRouteError,jsonError,requestId } from "@/shared/http";
import { rateLimit } from "@/shared/rate-limit";
const schema=z.object({name:z.string().trim().min(2).max(100),email:z.string().email().max(254),company:z.string().trim().max(120).optional(),message:z.string().trim().min(10).max(3000),website:z.string().max(0).optional()});
export async function POST(request:NextRequest){const id=requestId(request);try{if(!assertSameOrigin(request))return jsonError({code:"FORBIDDEN",message:"Origen no permitido."},id);const input=schema.parse(await request.json());if(input.website)return NextResponse.json({ok:true},{status:202});const limited=await rateLimit("contact",input.email,5,3600);if(!limited.ok)return jsonError(limited.error,id);if(!process.env.CONTACT_TO_EMAIL)throw new Error("CONTACT_TO_EMAIL is not configured");await getDb().outboxEvent.create({data:{topic:"email.contact",aggregateType:"ContactRequest",aggregateId:id,payload:{to:process.env.CONTACT_TO_EMAIL,name:input.name,email:input.email,company:input.company,message:input.message},correlationId:id}});return NextResponse.json({accepted:true},{status:202,headers:{"x-request-id":id}})}catch(error){return handleRouteError(error,id)}}
