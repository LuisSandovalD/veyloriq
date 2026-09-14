import { z } from "zod";

const nonEmpty = z.string().min(1);
const url = z.string().url();

export function databaseEnv() {
  return z.object({ DATABASE_URL: nonEmpty }).parse(process.env);
}

export function securityEnv() {
  return z.object({ SESSION_PEPPER: z.string().min(32), APP_URL: url }).parse(process.env);
}

export function mailEnv() {
  return z.object({
    BREVO_API_KEY: nonEmpty,
    BREVO_SENDER_EMAIL: z.string().email(),
    BREVO_SENDER_NAME: nonEmpty,
    APP_URL: url
  }).parse(process.env);
}

export function billingEnv() {
  return z.object({ MERCADOPAGO_ACCESS_TOKEN: nonEmpty, APP_URL: url }).parse(process.env);
}

export function aiEnv() {
  return z.object({ AI_BASE_URL: url, AI_API_KEY: nonEmpty, AI_MODEL: nonEmpty }).parse(process.env);
}

export function storageEnv() {
  return z.object({
    CLOUDINARY_CLOUD_NAME: nonEmpty,
    CLOUDINARY_API_KEY: nonEmpty,
    CLOUDINARY_API_SECRET: nonEmpty
  }).parse(process.env);
}
