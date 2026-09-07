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
  const bacPack = await db.pack.upsert({
    where: { slug: "bac-2027-foundation" },
    update: {},
    create: {
      slug: "bac-2027-foundation",
      name: "Baccalauréat Foundation Pack",
      description: "A complete starting pack for the Tunisian Baccalauréat.",
      priceCents: 0,
      items: { create: { categoryId: bac.id } },
    },
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
