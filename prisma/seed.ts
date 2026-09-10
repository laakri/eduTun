import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Roles as data — insert once, reference everywhere.
  const roleSlugs = [
    { slug: "student", displayName: "Student" },
    { slug: "prof", displayName: "Prof" },
    { slug: "company", displayName: "Company" },
    { slug: "admin", displayName: "Admin" },
  ];

  const roles: Record<string, string> = {};
  for (const r of roleSlugs) {
    const role = await db.role.upsert({
      where: { slug: r.slug },
      update: {},
      create: r,
    });
    roles[r.slug] = role.id;
  }

  const adminRoleId = roles.admin;
  const profRoleId = roles.prof;
  const studentRoleId = roles.student;

  if (!adminRoleId || !profRoleId || !studentRoleId) {
    throw new Error("Seed roles were not created correctly.");
  }

  // One test admin so you can hit the protected /api/admin/categories route.
  const adminEmail = "admin@test.com";
  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  });
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

  // One test admin so you can hit the protected /api/admin/categories route.
  const profEmail = "prof@test.com";
  const existingprof = await db.user.findUnique({
    where: { email: profEmail },
  });
  if (!existingprof) {
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
  // A couple of top-level categories to prove the Category/Pack model works.
  const bac = await db.category.upsert({
    where: { slug: "bac" },
    update: {},
    create: { slug: "bac", name: "Bac" },
  });
  await db.category.upsert({
    where: { slug: "pfe" },
    update: {},
    create: { slug: "pfe", name: "PFE" },
  });
  await db.category.upsert({
    where: { slug: "coding" },
    update: {},
    create: { slug: "coding", name: "Coding" },
  });
  for (const category of [
    { slug: "bac-maths", name: "Mathématiques" },
    { slug: "bac-sciences", name: "Sciences expérimentales" },
    { slug: "bac-info", name: "Informatique" },
    { slug: "bac-physique", name: "Physique" },
  ]) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, parentId: bac.id },
      create: { ...category, parentId: bac.id },
    });
  }
  async function upsertPack(input: {
    slug: string;
    name: string;
    description: string;
    priceCents: number;
    categoryIds: string[];
  }) {
    const pack = await db.pack.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
      },
      create: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
      },
    });

    await db.packItem.deleteMany({ where: { packId: pack.id } });
    await db.packItem.createMany({
      data: input.categoryIds.map((categoryId) => ({
        packId: pack.id,
        categoryId,
      })),
    });

    return pack;
  }

  const bacPack = await upsertPack({
    slug: "bac-2027-complete",
    name: "Baccalauréat 2027 — Complete",
    description: "All Bac subjects in one complete study pack.",
    priceCents: 14900,
    categoryIds: [bac.id],
  });

  const bacInfo = await db.category.findUniqueOrThrow({
    where: { slug: "bac-info" },
  });
  const bacMaths = await db.category.findUniqueOrThrow({
    where: { slug: "bac-maths" },
  });
  const bacSciences = await db.category.findUniqueOrThrow({
    where: { slug: "bac-sciences" },
  });
  const bacPhysique = await db.category.findUniqueOrThrow({
    where: { slug: "bac-physique" },
  });

  const professor = await db.user.findUniqueOrThrow({
    where: { email: profEmail },
  });
  const demoCourseTitle = "Bac Mathématiques — Fonctions";
  let demoCourse = await db.course.findFirst({
    where: { title: demoCourseTitle, profId: professor.id },
  });
  if (!demoCourse) {
    demoCourse = await db.course.create({
      data: {
        title: demoCourseTitle,
        description:
          "Un cours de démonstration inclus dans le pack Bac complet.",
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
            ready: false,
          },
        },
      },
    });
  }

  await upsertPack({
    slug: "bac-2027-informatique",
    name: "Bac 2027 — Informatique",
    description: "Focused preparation for the Informatique section.",
    priceCents: 4900,
    categoryIds: [bacInfo.id],
  });

  await upsertPack({
    slug: "bac-2027-mathematiques",
    name: "Bac 2027 — Mathématiques",
    description: "Focused preparation for the Mathématiques section.",
    priceCents: 4900,
    categoryIds: [bacMaths.id],
  });

  await upsertPack({
    slug: "bac-2027-sciences",
    name: "Bac 2027 — Sciences expérimentales",
    description: "Focused preparation for Sciences expérimentales.",
    priceCents: 4900,
    categoryIds: [bacSciences.id],
  });

  await upsertPack({
    slug: "bac-2027-physique",
    name: "Bac 2027 — Physique",
    description: "Focused preparation for the Physique section.",
    priceCents: 4900,
    categoryIds: [bacPhysique.id],
  });

  await upsertPack({
    slug: "bac-2027-mathematiques-physique",
    name: "Bac 2027 — Mathématiques + Physique",
    description: "A focused bundle for Mathématiques and Physique.",
    priceCents: 7900,
    categoryIds: [bacMaths.id, bacPhysique.id],
  });

  await db.packEnrollment.upsert({
    where: { userId_packId: { userId: student.id, packId: bacPack.id } },
    update: { status: "active" },
    create: { userId: student.id, packId: bacPack.id, source: "complimentary" },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
