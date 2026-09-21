import argon2 from "argon2";
import {
  permissionKeys,
  systemRolePermissions,
} from "../../src/modules/identity/domain/permissions";
import {
  daysAgo,
  daysFromNow,
  demoPassword,
  DEMO_ORGANIZATION_SLUG,
  seedId,
  tokenHash,
} from "./helpers";
import type { PlanIds, SeedContext, SeedDatabase } from "./types";

const demoUsers = [
  {
    key: "luis",
    email: "2301080307@undc.edu.pe",
    displayName: "Luis Enrique Sandoval Carbonel",
    role: "OWNER",
    platformRole: "PLATFORM_SUPERUSER" as const,
  },
  {
    key: "erick",
    email: "2301010375@undc.edu.pe",
    displayName: "Erick Paul Zamudio Sapacayo",
    role: "ADMIN",
    platformRole: null,
  },
  {
    key: "juan",
    email: "2301050259@undc.edu.pe",
    displayName: "Juan Joseph Ramos Chumpitaz",
    role: "SALES",
    platformRole: null,
  },
  {
    key: "josue",
    email: "2301010136@undc.edu.pe",
    displayName: "Josue Alberto Huaman Tacsa",
    role: "WAREHOUSE",
    platformRole: null,
  },
] as const;

const rankByRole: Record<string, number> = {
  OWNER: 100,
  ADMIN: 90,
  MANAGER: 70,
  SALES: 50,
  FINANCE: 50,
  WAREHOUSE: 50,
  SUPPORT: 40,
  VIEWER: 10,
};

export async function seedIdentity(
  db: SeedDatabase,
  planIds: PlanIds,
): Promise<SeedContext> {
  const passwordHash = await argon2.hash(demoPassword(), {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const organization = await db.organization.upsert({
    where: { slug: DEMO_ORGANIZATION_SLUG },
    update: {
      name: "VEYLORIQ Demo UNDC",
      status: "ACTIVE",
      legalName: "VEYLORIQ Gestión Empresarial S.A.C.",
      taxId: "20612345678",
      address: "Av. Mariscal Benavides 1370, San Vicente de Cañete",
      contactEmail: "contacto.veyloriq@gmail.com",
      contactPhone: "+51 955 410 820",
      currency: "PEN",
      locale: "es-PE",
      timeZone: "America/Lima",
      onboardingStep: 4,
      settings: {
        quotePrefix: "COT",
        purchasePrefix: "OC",
        orderPrefix: "PED",
        taxName: "IGV",
        defaultTaxRate: 18,
        dateFormat: "DD/MM/YYYY",
        weekStartsOn: "MONDAY",
        sessionTimeoutMinutes: 10_080,
        requireMfaForAdmins: false,
        opportunityStages: [
          "PROSPECTING",
          "QUALIFICATION",
          "PROPOSAL",
          "NEGOTIATION",
          "WON",
          "LOST",
        ],
      },
    },
    create: {
      name: "VEYLORIQ Demo UNDC",
      slug: DEMO_ORGANIZATION_SLUG,
      status: "ACTIVE",
      legalName: "VEYLORIQ Gestión Empresarial S.A.C.",
      taxId: "20612345678",
      address: "Av. Mariscal Benavides 1370, San Vicente de Cañete",
      contactEmail: "contacto.veyloriq@gmail.com",
      contactPhone: "+51 955 410 820",
      currency: "PEN",
      locale: "es-PE",
      timeZone: "America/Lima",
      onboardingStep: 4,
      createdAt: daysAgo(210),
      settings: {
        quotePrefix: "COT",
        purchasePrefix: "OC",
        orderPrefix: "PED",
        taxName: "IGV",
        defaultTaxRate: 18,
        dateFormat: "DD/MM/YYYY",
        weekStartsOn: "MONDAY",
        sessionTimeoutMinutes: 10_080,
        requireMfaForAdmins: false,
        opportunityStages: [
          "PROSPECTING",
          "QUALIFICATION",
          "PROPOSAL",
          "NEGOTIATION",
          "WON",
          "LOST",
        ],
      },
    },
  });

  const permissions = await db.permission.findMany({
    where: { key: { in: [...permissionKeys] } },
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(
    permissions.map((permission) => [permission.key, permission.id]),
  );
  const roles: Record<string, string> = {};

  for (const [name, grantedPermissions] of Object.entries(
    systemRolePermissions,
  )) {
    const role = await db.role.upsert({
      where: {
        organizationId_name: { organizationId: organization.id, name },
      },
      update: { isSystem: true, rank: rankByRole[name] ?? 50 },
      create: {
        organizationId: organization.id,
        name,
        isSystem: true,
        rank: rankByRole[name] ?? 50,
      },
    });
    roles[name] = role.id;
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({
      data: grantedPermissions.map((key) => {
        const permissionId = permissionIdByKey.get(key);
        if (!permissionId) throw new Error(`Falta el permiso ${key}.`);
        return { roleId: role.id, permissionId };
      }),
      skipDuplicates: true,
    });
  }

  const users = {} as SeedContext["users"];
  for (const [index, item] of demoUsers.entries()) {
    const user = await db.user.upsert({
      where: { email: item.email },
      update: {
        displayName: item.displayName,
        passwordHash,
        emailVerifiedAt: daysAgo(200 - index),
        platformRole: item.platformRole,
      },
      create: {
        email: item.email,
        displayName: item.displayName,
        passwordHash,
        emailVerifiedAt: daysAgo(200 - index),
        platformRole: item.platformRole,
        recoveryCodeHashes: [],
        createdAt: daysAgo(200 - index),
      },
    });
    users[item.key] = user.id;
    const roleId = roles[item.role];
    if (!roleId) throw new Error(`No se creó el rol ${item.role}.`);
    await db.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: { roleId, status: "ACTIVE", revokedAt: null },
      create: {
        organizationId: organization.id,
        userId: user.id,
        roleId,
        status: "ACTIVE",
        joinedAt: daysAgo(195 - index),
      },
    });
  }

  await db.subscription.upsert({
    where: { organizationId: organization.id },
    update: {
      planId: planIds.business,
      status: "ACTIVE",
      provider: "DEMO",
      billingCycle: "MONTHLY",
      currentPeriodEnd: daysAgo(-25),
      graceUntil: null,
      cancelAtPeriodEnd: false,
    },
    create: {
      organizationId: organization.id,
      planId: planIds.business,
      status: "ACTIVE",
      provider: "DEMO",
      providerId: "demo-subscription-undc",
      billingCycle: "MONTHLY",
      currentPeriodEnd: daysAgo(-25),
      createdAt: daysAgo(190),
    },
  });

  const viewerRoleId = roles.VIEWER;
  if (!viewerRoleId) throw new Error("No se creó el rol VIEWER.");
  await db.invitation.upsert({
    where: { tokenHash: tokenHash("veyloriq-demo-invitation-analyst") },
    update: {
      organizationId: organization.id,
      email: "analista.veyloriq.demo@gmail.com",
      roleId: viewerRoleId,
      expiresAt: daysFromNow(7),
      acceptedAt: null,
      revokedAt: null,
      acceptedById: null,
    },
    create: {
      id: seedId("invitation:demo-analyst"),
      organizationId: organization.id,
      email: "analista.veyloriq.demo@gmail.com",
      roleId: viewerRoleId,
      tokenHash: tokenHash("veyloriq-demo-invitation-analyst"),
      expiresAt: daysFromNow(7),
      createdAt: daysAgo(1),
    },
  });

  const bootstrapEmail = process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = process.env.PLATFORM_BOOTSTRAP_PASSWORD;
  if (Boolean(bootstrapEmail) !== Boolean(bootstrapPassword)) {
    throw new Error(
      "PLATFORM_BOOTSTRAP_EMAIL y PLATFORM_BOOTSTRAP_PASSWORD deben configurarse juntos.",
    );
  }
  if (bootstrapEmail && bootstrapPassword) {
    if (bootstrapPassword.length < 16) {
      throw new Error(
        "PLATFORM_BOOTSTRAP_PASSWORD debe tener al menos 16 caracteres.",
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bootstrapEmail)) {
      throw new Error("PLATFORM_BOOTSTRAP_EMAIL no es válido.");
    }
    const bootstrapHash = await argon2.hash(bootstrapPassword, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    await db.user.upsert({
      where: { email: bootstrapEmail },
      update: {
        displayName: "Platform Superuser",
        passwordHash: bootstrapHash,
        emailVerifiedAt: new Date(),
        platformRole: "PLATFORM_SUPERUSER",
      },
      create: {
        email: bootstrapEmail,
        displayName: "Platform Superuser",
        passwordHash: bootstrapHash,
        emailVerifiedAt: new Date(),
        platformRole: "PLATFORM_SUPERUSER",
        recoveryCodeHashes: [],
      },
    });
  }

  return {
    organizationId: organization.id,
    planIds,
    users,
    roles,
  };
}
