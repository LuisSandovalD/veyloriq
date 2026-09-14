import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSession,
  getAuthContext,
  requirePermission,
} from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    email: z.string().email(),
    roleId: z.string().cuid(),
  }),
  z.object({ action: z.literal("resend"), invitationId: z.string().cuid() }),
  z.object({
    action: z.literal("revoke_invitation"),
    invitationId: z.string().cuid(),
  }),
  z.object({ action: z.literal("accept"), token: z.string().min(20) }),
  z.object({
    action: z.literal("accept_new"),
    token: z.string().min(20),
    displayName: z.string().trim().min(2).max(100),
    password: z
      .string()
      .min(12)
      .max(128)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/\d/),
  }),
  z.object({ action: z.literal("remove"), userId: z.string().cuid() }),
  z.object({
    action: z.literal("change_role"),
    userId: z.string().cuid(),
    roleId: z.string().cuid(),
  }),
  z.object({
    action: z.literal("transfer_ownership"),
    userId: z.string().cuid(),
    password: z.string().min(1).max(128),
  }),
]);
const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");

class MemberOperationError extends Error {
  constructor(
    readonly code: "CONFLICT" | "LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
  }
}

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission(
      "members.manage",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const [members, invitations, roles] = await Promise.all([
      getDb().membership.findMany({
        where: { organizationId, status: "ACTIVE" },
        select: {
          id: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              mfaEnabled: true,
            },
          },
          role: { select: { id: true, name: true, rank: true } },
        },
        orderBy: { joinedAt: "asc" },
      }),
      getDb().invitation.findMany({
        where: {
          organizationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          roleId: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      getDb().role.findMany({
        where: { organizationId },
        select: { id: true, name: true, rank: true, isSystem: true },
        orderBy: { rank: "desc" },
      }),
    ]);
    return NextResponse.json(
      { members, invitations, roles },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen de solicitud no permitido." },
        id,
      );
    const input = schema.parse(await request.json());
    const db = getDb();
    if (input.action === "accept_new") {
      const invitation = await db.invitation.findUnique({
        where: { tokenHash: hashToken(input.token) },
      });
      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date()
      )
        return jsonError(
          {
            code: "VALIDATION",
            message: "La invitación no es válida o venció.",
          },
          id,
        );
      if (
        await db.user.findUnique({
          where: { email: invitation.email.toLowerCase() },
        })
      )
        return jsonError(
          {
            code: "CONFLICT",
            message:
              "Ya existe una cuenta con ese correo. Inicia sesión para aceptar.",
          },
          id,
        );
      const passwordHash = await argon2.hash(input.password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      const user = await db.$transaction(async (tx) => {
        const claimed = await tx.invitation.updateMany({
          where: {
            id: invitation.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        });
        if (claimed.count !== 1) throw new Error("Invitation already claimed");
        const created = await tx.user.create({
          data: {
            email: invitation.email.toLowerCase(),
            displayName: input.displayName,
            passwordHash,
            emailVerifiedAt: new Date(),
            recoveryCodeHashes: [],
          },
        });
        await tx.membership.create({
          data: {
            organizationId: invitation.organizationId,
            userId: created.id,
            roleId: invitation.roleId,
          },
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { acceptedById: created.id },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: invitation.organizationId,
            actorId: created.id,
            action: "invitation.accept_new",
            resourceType: "Invitation",
            resourceId: invitation.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        });
        return created;
      });
      await createSession(user.id, {
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json(
        { ok: true },
        { status: 201, headers: { "x-request-id": id } },
      );
    }
    if (input.action === "accept") {
      const context = await getAuthContext();
      if (!context.ok) return jsonError(context.error, id);
      const invitation = await db.invitation.findUnique({
        where: { tokenHash: hashToken(input.token) },
      });
      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date()
      )
        return jsonError(
          {
            code: "VALIDATION",
            message: "La invitación no es válida o venció.",
          },
          id,
        );
      if (invitation.email.toLowerCase() !== context.value.email.toLowerCase())
        return jsonError(
          {
            code: "FORBIDDEN",
            message: "La invitación pertenece a otro correo.",
          },
          id,
        );
      await db.$transaction(async (tx) => {
        const claimed = await tx.invitation.updateMany({
          where: { id: invitation.id, acceptedAt: null, revokedAt: null },
          data: { acceptedAt: new Date(), acceptedById: context.value.userId },
        });
        if (claimed.count !== 1) throw new Error("Invitation already claimed");
        await tx.membership.upsert({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId: context.value.userId,
            },
          },
          update: {
            roleId: invitation.roleId,
            status: "ACTIVE",
            revokedAt: null,
          },
          create: {
            organizationId: invitation.organizationId,
            userId: context.value.userId,
            roleId: invitation.roleId,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: invitation.organizationId,
            actorId: context.value.userId,
            action: "invitation.accept",
            resourceType: "Invitation",
            resourceId: invitation.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        });
      });
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    const context = await requirePermission(
      "members.manage",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const actorMembership = await db.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: context.value.userId },
      },
      include: { role: true },
    });
    if (!actorMembership)
      return jsonError(
        { code: "FORBIDDEN", message: "Membresía no encontrada." },
        id,
      );
    if (input.action === "invite") {
      const role = await db.role.findUnique({
        where: { organizationId_id: { organizationId, id: input.roleId } },
      });
      if (
        !role ||
        (role.rank >= actorMembership.role.rank &&
          actorMembership.role.name !== "OWNER")
      )
        return jsonError(
          {
            code: "FORBIDDEN",
            message: "No puedes delegar un rol igual o superior al propio.",
          },
          id,
        );
      const token = randomBytes(32).toString("base64url");
      const invitation = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:users`}, 0))`;
        const [
          subscription,
          existingMember,
          pending,
          memberCount,
          invitationCount,
        ] = await Promise.all([
          tx.subscription.findUnique({
            where: { organizationId },
            include: { plan: true },
          }),
          tx.user.findUnique({
            where: { email: input.email.toLowerCase() },
            select: {
              memberships: {
                where: { organizationId, status: "ACTIVE" },
                select: { id: true },
              },
            },
          }),
          tx.invitation.findFirst({
            where: {
              organizationId,
              email: { equals: input.email, mode: "insensitive" },
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          }),
          tx.membership.count({
            where: { organizationId, status: "ACTIVE" },
          }),
          tx.invitation.count({
            where: {
              organizationId,
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          }),
        ]);
        if (existingMember?.memberships.length) {
          throw new MemberOperationError(
            "CONFLICT",
            "Ese usuario ya pertenece a la organización.",
          );
        }
        if (pending) {
          throw new MemberOperationError(
            "CONFLICT",
            "Ya existe una invitación vigente para ese correo.",
          );
        }
        const limits = subscription?.plan.limits as { users?: number } | null;
        if (limits?.users && memberCount + invitationCount >= limits.users) {
          throw new MemberOperationError(
            "LIMIT_EXCEEDED",
            "Alcanzaste el límite de usuarios del plan.",
          );
        }
        const created = await tx.invitation.create({
          data: {
            organizationId,
            email: input.email.toLowerCase(),
            roleId: role.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        });
        await tx.outboxEvent.create({
          data: {
            organizationId,
            topic: "email.invitation",
            aggregateType: "Invitation",
            aggregateId: created.id,
            payload: {
              email: created.email,
              organization: context.value.organizationName,
              token,
            },
            correlationId: id,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: "invitation.create",
            resourceType: "Invitation",
            resourceId: created.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        });
        return created;
      });
      return NextResponse.json(
        { id: invitation.id },
        { status: 201, headers: { "x-request-id": id } },
      );
    }
    if (input.action === "resend") {
      const invitation = await db.invitation.findFirst({
        where: {
          id: input.invitationId,
          organizationId,
          acceptedAt: null,
          revokedAt: null,
        },
      });
      if (!invitation)
        return jsonError(
          { code: "NOT_FOUND", message: "Invitación no encontrada." },
          id,
        );
      const recentlyResent = await db.auditEvent.findFirst({
        where: {
          organizationId,
          action: "invitation.resend",
          resourceId: invitation.id,
          createdAt: { gt: new Date(Date.now() - 60_000) },
        },
      });
      if (
        Date.now() - invitation.createdAt.getTime() < 60_000 ||
        recentlyResent
      )
        return jsonError(
          {
            code: "LIMIT_EXCEEDED",
            message: "Espera un minuto antes de reenviar la invitación.",
          },
          id,
        );
      const token = randomBytes(32).toString("base64url");
      await db.$transaction([
        db.invitation.update({
          where: { id: invitation.id },
          data: {
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        }),
        db.outboxEvent.create({
          data: {
            organizationId,
            topic: "email.invitation",
            aggregateType: "Invitation",
            aggregateId: invitation.id,
            payload: {
              email: invitation.email,
              organization: context.value.organizationName,
              token,
            },
            correlationId: id,
          },
        }),
        db.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: "invitation.resend",
            resourceType: "Invitation",
            resourceId: invitation.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        }),
      ]);
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    if (input.action === "revoke_invitation") {
      await db.$transaction([
        db.invitation.updateMany({
          where: { id: input.invitationId, organizationId, acceptedAt: null },
          data: { revokedAt: new Date() },
        }),
        db.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: "invitation.revoke",
            resourceType: "Invitation",
            resourceId: input.invitationId,
            outcome: "SUCCESS",
            correlationId: id,
          },
        }),
      ]);
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    const target = await db.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: input.userId },
      },
      include: { role: true },
    });
    if (!target || target.status !== "ACTIVE")
      return jsonError(
        { code: "NOT_FOUND", message: "Miembro no encontrado." },
        id,
      );
    if (input.action === "remove") {
      if (target.role.name === "OWNER")
        return jsonError(
          {
            code: "CONFLICT",
            message: "Transfiere la propiedad antes de retirar al propietario.",
          },
          id,
        );
      await db.$transaction([
        db.membership.update({
          where: { id: target.id },
          data: { status: "REVOKED", revokedAt: new Date() },
        }),
        db.session.updateMany({
          where: { userId: target.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        db.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: "membership.remove",
            resourceType: "Membership",
            resourceId: target.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        }),
      ]);
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    if (input.action === "change_role") {
      const role = await db.role.findUnique({
        where: { organizationId_id: { organizationId, id: input.roleId } },
      });
      if (
        !role ||
        role.name === "OWNER" ||
        role.rank >= actorMembership.role.rank
      )
        return jsonError(
          { code: "FORBIDDEN", message: "No puedes asignar ese rol." },
          id,
        );
      await db.$transaction([
        db.membership.update({
          where: { id: target.id },
          data: { roleId: role.id },
        }),
        db.session.updateMany({
          where: { userId: target.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        db.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: "membership.role.change",
            resourceType: "Membership",
            resourceId: target.id,
            outcome: "SUCCESS",
            changes: { roleId: role.id },
            correlationId: id,
          },
        }),
      ]);
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    const actor = await db.user.findUnique({
      where: { id: context.value.userId },
    });
    if (
      actorMembership.role.name !== "OWNER" ||
      !actor ||
      !(await argon2.verify(actor.passwordHash, input.password))
    )
      return jsonError(
        {
          code: "UNAUTHENTICATED",
          message: "La transferencia requiere al propietario y su contraseña.",
        },
        id,
      );
    const adminRole = await db.role.findUnique({
      where: { organizationId_name: { organizationId, name: "ADMIN" } },
    });
    if (!adminRole) throw new Error("ADMIN role missing");
    await db.$transaction([
      db.membership.update({
        where: { id: target.id },
        data: { roleId: actorMembership.role.id },
      }),
      db.membership.update({
        where: { id: actorMembership.id },
        data: { roleId: adminRole.id },
      }),
      db.session.updateMany({
        where: {
          userId: { in: [target.userId, context.value.userId] },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
      db.auditEvent.create({
        data: {
          organizationId,
          actorId: context.value.userId,
          action: "organization.owner.transfer",
          resourceType: "Membership",
          resourceId: target.id,
          outcome: "SUCCESS",
          correlationId: id,
        },
      }),
    ]);
    return NextResponse.json(
      { ok: true, reloginRequired: true },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof MemberOperationError)
      return jsonError({ code: error.code, message: error.message }, id);
    return handleRouteError(error, id);
  }
}
