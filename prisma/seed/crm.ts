import { daysAgo, daysFromNow, seedId } from "./helpers";
import type { CrmContext, SeedContext, SeedDatabase } from "./types";

export async function seedCrm(
  db: SeedDatabase,
  context: SeedContext,
): Promise<CrmContext> {
  const organizationId = context.organizationId;
  const customerData = [
    {
      key: "acme",
      name: "Distribuidora ACME Cañete",
      taxId: "20548796321",
      email: "compras.acme.canete@gmail.com",
      phone: "+51 944 120 301",
      address: "Jr. O'Higgins 245, San Vicente de Cañete",
      tags: ["B2B", "Tecnología"],
      age: 155,
    },
    {
      key: "panaderia",
      name: "Panadería Sol de Mala",
      taxId: "10458741236",
      email: "panaderiasoldemala@gmail.com",
      phone: "+51 987 224 610",
      address: "Av. Marchand 410, Mala",
      tags: ["Pyme", "Recurrente"],
      age: 112,
    },
    {
      key: "constructora",
      name: "Constructora Valle Sur S.A.C.",
      taxId: "20605874129",
      email: "administracion.vallesur@gmail.com",
      phone: "+51 965 778 412",
      address: "Av. Libertadores 850, Imperial",
      tags: ["B2B", "Proyecto"],
      age: 68,
    },
    {
      key: "restaurante",
      name: "Restaurante El Buen Sabor",
      taxId: "10412036987",
      email: "elbuen.sabor.canete@gmail.com",
      phone: "+51 932 561 407",
      address: "Jr. Grau 118, San Vicente de Cañete",
      tags: ["Pyme", "Prospecto"],
      age: 18,
    },
  ] as const;

  const customers = {} as CrmContext["customers"];
  for (const item of customerData) {
    const id = seedId(`customer:${item.key}`);
    const saved = await db.customer.upsert({
      where: { organizationId_id: { organizationId, id } },
      update: {
        name: item.name,
        taxId: item.taxId,
        email: item.email,
        phone: item.phone,
        address: item.address,
        tags: [...item.tags],
        archivedAt: null,
      },
      create: {
        id,
        organizationId,
        name: item.name,
        taxId: item.taxId,
        email: item.email,
        phone: item.phone,
        address: item.address,
        tags: [...item.tags],
        createdAt: daysAgo(item.age),
      },
    });
    customers[item.key] = saved.id;
  }

  const contacts = {
    acme: seedId("contact:acme"),
    panaderia: seedId("contact:panaderia"),
  };
  await db.contact.upsert({
    where: { organizationId_id: { organizationId, id: contacts.acme } },
    update: {
      customerId: customers.acme,
      name: "María Fernanda Torres",
      email: "maria.torres.acme@gmail.com",
      phone: "+51 975 410 223",
      title: "Jefa de compras",
    },
    create: {
      id: contacts.acme,
      organizationId,
      customerId: customers.acme,
      name: "María Fernanda Torres",
      email: "maria.torres.acme@gmail.com",
      phone: "+51 975 410 223",
      title: "Jefa de compras",
    },
  });
  await db.contact.upsert({
    where: {
      organizationId_id: { organizationId, id: contacts.panaderia },
    },
    update: {
      customerId: customers.panaderia,
      name: "Carlos Medina Flores",
      email: "carlos.medina.negocios@gmail.com",
      phone: "+51 954 612 700",
      title: "Administrador",
    },
    create: {
      id: contacts.panaderia,
      organizationId,
      customerId: customers.panaderia,
      name: "Carlos Medina Flores",
      email: "carlos.medina.negocios@gmail.com",
      phone: "+51 954 612 700",
      title: "Administrador",
    },
  });

  const leads = {
    newLead: seedId("lead:new"),
    qualified: seedId("lead:qualified"),
    converted: seedId("lead:converted"),
  };
  const leadData = [
    {
      id: leads.newLead,
      name: "Andrea Rojas Paredes",
      company: "Hotel Costa Azul",
      email: "andrea.rojas.hotel@gmail.com",
      phone: "+51 920 315 840",
      source: "WEB",
      status: "NEW" as const,
      ownerId: context.users.juan,
      convertedAt: null,
      age: 6,
    },
    {
      id: leads.qualified,
      name: "Renato Salazar Campos",
      company: "Agroexportadora del Valle",
      email: "renato.salazar.agro@gmail.com",
      phone: "+51 948 671 205",
      source: "REFERIDO",
      status: "QUALIFIED" as const,
      ownerId: context.users.juan,
      convertedAt: null,
      age: 24,
    },
    {
      id: leads.converted,
      name: "Víctor Mendoza Ruiz",
      company: "Constructora Valle Sur S.A.C.",
      email: "victor.mendoza.obras@gmail.com",
      phone: "+51 963 801 451",
      source: "FERIA",
      status: "CONVERTED" as const,
      ownerId: context.users.erick,
      convertedAt: daysAgo(64),
      age: 82,
    },
  ];
  for (const item of leadData) {
    await db.lead.upsert({
      where: { organizationId_id: { organizationId, id: item.id } },
      update: {
        name: item.name,
        company: item.company,
        email: item.email,
        phone: item.phone,
        source: item.source,
        status: item.status,
        ownerId: item.ownerId,
        convertedAt: item.convertedAt,
      },
      create: {
        id: item.id,
        organizationId,
        name: item.name,
        company: item.company,
        email: item.email,
        phone: item.phone,
        source: item.source,
        status: item.status,
        ownerId: item.ownerId,
        convertedAt: item.convertedAt,
        createdAt: daysAgo(item.age),
      },
    });
  }

  const opportunities = {
    negotiation: seedId("opportunity:negotiation"),
    won: seedId("opportunity:won"),
    prospecting: seedId("opportunity:prospecting"),
  };
  const opportunityData = [
    {
      id: opportunities.negotiation,
      customerId: customers.constructora,
      title: "Renovación de equipos administrativos",
      stage: "NEGOTIATION",
      value: 12_500,
      probability: 70,
      ownerId: context.users.juan,
      expectedClose: daysFromNow(18),
      age: 42,
    },
    {
      id: opportunities.won,
      customerId: customers.acme,
      title: "Equipamiento para nueva sede",
      stage: "WON",
      value: 1_864.4,
      probability: 100,
      ownerId: context.users.erick,
      expectedClose: daysAgo(38),
      age: 96,
    },
    {
      id: opportunities.prospecting,
      customerId: customers.restaurante,
      title: "Digitalización de punto de venta",
      stage: "PROSPECTING",
      value: 4_200,
      probability: 20,
      ownerId: context.users.juan,
      expectedClose: daysFromNow(35),
      age: 12,
    },
  ];
  for (const item of opportunityData) {
    await db.opportunity.upsert({
      where: { organizationId_id: { organizationId, id: item.id } },
      update: {
        customerId: item.customerId,
        title: item.title,
        stage: item.stage,
        value: item.value,
        currency: "PEN",
        probability: item.probability,
        ownerId: item.ownerId,
        expectedClose: item.expectedClose,
      },
      create: {
        id: item.id,
        organizationId,
        customerId: item.customerId,
        title: item.title,
        stage: item.stage,
        value: item.value,
        currency: "PEN",
        probability: item.probability,
        ownerId: item.ownerId,
        expectedClose: item.expectedClose,
        createdAt: daysAgo(item.age),
      },
    });
  }

  const activities = [
    {
      key: "call-acme",
      type: "CALL",
      subject: "Validación de requerimientos de ACME",
      body: "Se confirmaron dos monitores y dos mouse para la nueva área.",
      resourceType: "Customer",
      resourceId: customers.acme,
      actorId: context.users.juan,
      age: 52,
    },
    {
      key: "meeting-valle",
      type: "MEETING",
      subject: "Presentación de propuesta a Valle Sur",
      body: "El cliente pidió incluir soporte y capacitación en la propuesta.",
      resourceType: "Opportunity",
      resourceId: opportunities.negotiation,
      actorId: context.users.erick,
      age: 9,
    },
    {
      key: "followup-hotel",
      type: "FOLLOW_UP",
      subject: "Seguimiento a Hotel Costa Azul",
      body: "Enviar catálogo actualizado durante la semana.",
      resourceType: "Lead",
      resourceId: leads.newLead,
      actorId: context.users.juan,
      age: 2,
    },
  ];
  for (const item of activities) {
    const id = seedId(`activity:${item.key}`);
    await db.activity.upsert({
      where: { id },
      update: {
        type: item.type,
        subject: item.subject,
        body: item.body,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        actorId: item.actorId,
        occurredAt: daysAgo(item.age),
      },
      create: {
        id,
        organizationId,
        type: item.type,
        subject: item.subject,
        body: item.body,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        actorId: item.actorId,
        occurredAt: daysAgo(item.age),
      },
    });
  }

  return { customers, contacts, leads, opportunities };
}

