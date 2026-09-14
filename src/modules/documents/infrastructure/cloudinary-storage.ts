import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { storageEnv } from "@/shared/env";

function configure() {
  const env = storageEnv();
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
}

export async function uploadPrivate(input: { bytes: Buffer; organizationId: string; documentId: string; filename: string }): Promise<{ key: string; bytes: number }> {
  configure();
  const publicId = `VEYLORIQ/${input.organizationId}/${input.documentId}/${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: "raw", type: "authenticated", public_id: publicId, overwrite: false, use_filename: false }, (error, value) => error || !value ? reject(error ?? new Error("Cloudinary returned no upload")) : resolve(value));
    stream.end(input.bytes);
  });
  return { key: result.public_id, bytes: result.bytes };
}

export function privateDownloadUrl(key: string, _filename: string, attachment = true): string {
  configure();
  return cloudinary.utils.private_download_url(key, "", { resource_type: "raw", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 300, attachment });
}

export async function deletePrivate(key: string): Promise<void> {
  configure();
  const result = await cloudinary.uploader.destroy(key, { resource_type: "raw", type: "authenticated", invalidate: true });
  if (!["ok", "not found"].includes(result.result)) throw new Error(`Cloudinary delete failed: ${result.result}`);
}
