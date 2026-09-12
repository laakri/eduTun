import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const roleSlugs = [
    { slug: "student", displayName: "Student" },
    { slug: "prof", displayName: "Prof" },
    { slug: "company", displayName: "Company" },
    { slug: "admin", displayName: "Admin" },
  ];

  const roles: Record<string, string> = {};
  for (const role of roleSlugs) {
    const createdRole = await db.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: role,
    });
    roles[role.slug] = createdRole.id;
  }

  const adminRoleId = roles.admin;
  const profRoleId = roles.prof;
  const studentRoleId = roles.student;

  if (!adminRoleId || !profRoleId || !studentRoleId) {
    throw new Error("Seed roles were not created correctly.");
  }

  const adminEmail = "admin@test.com";
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("password123", 10);
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: "Test Admin",
        roles: { create: { roleId: adminRoleId } },
      },
    });
    console.log(`Created admin: ${adminEmail} / password123`);
  }

  const profEmail = "prof@test.com";
  const existingProf = await db.user.findUnique({ where: { email: profEmail } });
  if (!existingProf) {
    const passwordHash = await bcrypt.hash("password123", 10);
    await db.user.create({
      data: {
        email: profEmail,
        passwordHash,
        fullName: "Test prof",
        roles: { create: { roleId: profRoleId } },
      },
    });
    console.log(`Created prof: ${profEmail} / password123`);
  }

  const studentEmail = "student@test.com";
  let student = await db.user.findUnique({ where: { email: studentEmail } });
  if (!student) {
    student = await db.user.create({
      data: {
        email: studentEmail,
        passwordHash: await bcrypt.hash("password123", 10),
        fullName: "Test Student",
        roles: { create: { roleId: studentRoleId } },
      },
    });
    console.log(`Created student: ${studentEmail} / password123`);
  }

  const bac = await db.category.upsert({
    where: { slug: "bac" },
    update: {},
    create: { slug: "bac", name: "Bac" },
  });
  const pfe = await db.category.upsert({
    where: { slug: "pfe" },
    update: {},
    create: { slug: "pfe", name: "PFE" },
  });

  for (const category of [
    { slug: "bac-maths", name: "Mathématiques" },
    { slug: "bac-sciences", name: "Sciences expérimentales" },
    { slug: "bac-info", name: "Informatique" },
    { slug: "bac-physique", name: "Physique" },
  ]) {
    const existingCategory = await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { ...category },
    });

    await db.categoryRelation.upsert({
      where: { parentId_childId: { parentId: bac.id, childId: existingCategory.id } },
      update: { order: 0 },
      create: { parentId: bac.id, childId: existingCategory.id, order: 0 },
    });
  }

  async function upsertSubscriptionPlan(input: {
    slug: string;
    name: string;
    description: string;
    domainId: string;
    monthlyPriceCents: number;
    quarterlyPriceCents: number;
    yearlyPriceCents: number;
  }) {
    return db.subscriptionPlan.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        description: input.description,
        domainId: input.domainId,
        monthlyPriceCents: input.monthlyPriceCents,
        quarterlyPriceCents: input.quarterlyPriceCents,
        yearlyPriceCents: input.yearlyPriceCents,
        isActive: true,
      },
      create: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        domainId: input.domainId,
        monthlyPriceCents: input.monthlyPriceCents,
        quarterlyPriceCents: input.quarterlyPriceCents,
        yearlyPriceCents: input.yearlyPriceCents,
      },
    });
  }

  const bacPlan = await upsertSubscriptionPlan({
    slug: "bac-domain",
    name: "Bac Unlimited",
    description: "Access the full Bac domain with one month, three months, or a full year.",
    domainId: bac.id,
    monthlyPriceCents: 12900,
    quarterlyPriceCents: 32900,
    yearlyPriceCents: 109900,
  });

  const pfePlan = await upsertSubscriptionPlan({
    slug: "pfe-domain",
    name: "PFE Access",
    description: "Future-ready access for the PFE domain when it is launched.",
    domainId: pfe.id,
    monthlyPriceCents: 0,
    quarterlyPriceCents: 0,
    yearlyPriceCents: 0,
  });

  const professor = await db.user.findUniqueOrThrow({ where: { email: profEmail } });
  const bacMaths = await db.category.findUniqueOrThrow({ where: { slug: "bac-maths" } });
  const demoCourseTitle = "Bac Mathématiques — Fonctions";

  let demoCourse = await db.course.findFirst({
    where: { title: demoCourseTitle, profId: professor.id },
  });

  if (!demoCourse) {
    demoCourse = await db.course.create({
      data: {
        title: demoCourseTitle,
        description: "A demonstration course included in the Bac domain subscription.",
        profId: professor.id,
        published: true,
        categories: { create: [{ categoryId: bacMaths.id }] },
        chapters: {
          create: {
            title: "Introduction aux fonctions",
            order: 1,
            videoProvider: "bunny",
            videoId: "00000000-0000-0000-0000-000000000001",
            videoStatus: "PROCESSING",
          },
        },
      },
    });
  }

  const existingSubscription = await db.userSubscription.findFirst({
    where: {
      userId: student.id,
      planId: bacPlan.id,
      status: "active",
    },
  });

  if (!existingSubscription) {
    await db.userSubscription.create({
      data: {
        userId: student.id,
        planId: bacPlan.id,
        billingCycle: "month",
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Plans seeded: ${bacPlan.name}, ${pfePlan.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
