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

  const studentTwoEmail = "student2@test.com";
  let studentTwo = await db.user.findUnique({ where: { email: studentTwoEmail } });
  if (!studentTwo) {
    studentTwo = await db.user.create({
      data: {
        email: studentTwoEmail,
        passwordHash: await bcrypt.hash("password123", 10),
        fullName: "Nour Ben Salem",
        phone: "+216 22 000 002",
        roles: { create: { roleId: studentRoleId } },
      },
    });
  }

  const companyRoleId = roles.company;
  const companyEmail = "company@test.com";
  let company = await db.user.findUnique({ where: { email: companyEmail } });
  if (!company && companyRoleId) {
    company = await db.user.create({
      data: {
        email: companyEmail,
        passwordHash: await bcrypt.hash("password123", 10),
        fullName: "Tech Tunisia HR",
        phone: "+216 71 000 003",
        roles: { create: { roleId: companyRoleId } },
      },
    });
  }

  const extraProfessors: Array<{ id: string; fullName: string; email: string }> = [];
  const professorNames = [
    "Amine Trabelsi",
    "Sarra Mansour",
    "Youssef Gharbi",
    "Meriem Jaziri",
    "Hatem Kallel",
    "Ines Ben Amor",
    "Omar Mejri",
    "Rim Chelly",
  ];
  const sharedPasswordHash = await bcrypt.hash("password123", 10);
  for (const [index, fullName] of professorNames.entries()) {
    const email = `prof${index + 2}@test.com`;
    const seededProfessor = await db.user.upsert({
      where: { email },
      update: { fullName, bio: `Professeur de préparation au Bac en ${index % 2 === 0 ? "sciences" : "langues et méthodes"}.`, specialties: index % 2 === 0 ? "Bac · Sciences · Méthodologie" : "Bac · Langues · Révision" },
      create: {
        email,
        passwordHash: sharedPasswordHash,
        fullName,
        bio: `Professeur de préparation au Bac en ${index % 2 === 0 ? "sciences" : "langues et méthodes"}.`,
        specialties: index % 2 === 0 ? "Bac · Sciences · Méthodologie" : "Bac · Langues · Révision",
        roles: { create: { roleId: profRoleId } },
      },
    });
    extraProfessors.push({ id: seededProfessor.id, fullName, email });
  }

  const extraStudents: Array<{ id: string; fullName: string; email: string }> = [];
  const firstNames = ["Aya", "Malek", "Sami", "Lina", "Rayen", "Maya", "Adam", "Yasmine", "Wassim", "Nour"];
  const lastNames = ["Ben Ali", "Haddad", "Khemiri", "Saidi", "Mrad", "Hammami", "Bouzid", "Karray", "Dridi", "Tlili"];
  for (let index = 0; index < 40; index += 1) {
    const fullName = `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
    const email = `student${String(index + 3).padStart(2, "0")}@test.com`;
    const seededStudent = await db.user.upsert({
      where: { email },
      update: { fullName, phone: `+216 2${String(index + 10).padStart(7, "0")}` },
      create: {
        email,
        passwordHash: sharedPasswordHash,
        fullName,
        phone: `+216 2${String(index + 10).padStart(7, "0")}`,
        roles: { create: { roleId: studentRoleId } },
      },
    });
    extraStudents.push({ id: seededStudent.id, fullName, email });
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

  const legacySubjects = await db.category.findMany({
    where: { slug: { in: ["bac-maths", "bac-sciences", "bac-info", "bac-physique"] } },
    select: { id: true },
  });
  if (legacySubjects.length > 0) {
    await db.categoryRelation.deleteMany({
      where: {
        parentId: bac.id,
        childId: { in: legacySubjects.map((category) => category.id) },
      },
    });
  }

  const bacSubjects = [
    { slug: "subject-mathematiques", name: "Mathématiques" },
    { slug: "subject-physique", name: "Physique" },
    { slug: "subject-chimie", name: "Chimie" },
    { slug: "subject-sciences-vie-terre", name: "Sciences de la vie et de la Terre" },
    { slug: "subject-informatique", name: "Informatique" },
    { slug: "subject-algorithmique", name: "Algorithmique" },
    { slug: "subject-francais", name: "Français" },
    { slug: "subject-anglais", name: "Anglais" },
    { slug: "subject-arabe", name: "Arabe" },
    { slug: "subject-histoire", name: "Histoire" },
    { slug: "subject-geographie", name: "Géographie" },
    { slug: "subject-philosophie", name: "Philosophie" },
  ];

  const subjectCategories: Record<string, { id: string; name: string }> = {};
  for (const category of bacSubjects) {
    const existingCategory = await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { ...category },
    });

    subjectCategories[category.slug] = existingCategory;

    await db.categoryRelation.upsert({
      where: { parentId_childId: { parentId: bac.id, childId: existingCategory.id } },
      update: { order: bacSubjects.indexOf(category) },
      create: { parentId: bac.id, childId: existingCategory.id, order: bacSubjects.indexOf(category) },
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
  const demoVideoId = "cb86f717-667b-46b3-a96b-16f15274fa6b";

  await db.course.deleteMany({
    where: {
      profId: professor.id,
      title: "Bac Mathématiques — Fonctions",
    },
  });

  const demoCourses = [
    { title: "Fonctions et variations", subject: "subject-mathematiques", description: "Comprendre les fonctions, leurs variations et leur représentation graphique." },
    { title: "Dérivation et étude de fonctions", subject: "subject-mathematiques", description: "Maîtriser la dérivation pour résoudre les exercices du Bac." },
    { title: "Suites numériques", subject: "subject-mathematiques", description: "Les suites arithmétiques, géométriques et leurs applications." },
    { title: "Mécanique : mouvements et forces", subject: "subject-physique", description: "Lire un mouvement et appliquer les lois fondamentales de la mécanique." },
    { title: "Électricité et circuits", subject: "subject-physique", description: "Tension, intensité, énergie et résolution de circuits électriques." },
    { title: "Ondes et signaux", subject: "subject-physique", description: "Les notions essentielles sur les ondes, fréquences et signaux." },
    { title: "Transformations chimiques", subject: "subject-chimie", description: "Équations, avancement et bilans des transformations chimiques." },
    { title: "Acides, bases et pH", subject: "subject-chimie", description: "Comprendre les réactions acido-basiques et les calculs de pH." },
    { title: "Génétique et hérédité", subject: "subject-sciences-vie-terre", description: "Les bases de la génétique et de la transmission des caractères." },
    { title: "Immunité et santé", subject: "subject-sciences-vie-terre", description: "Le fonctionnement du système immunitaire et les enjeux de santé." },
    { title: "Algorithmique fondamentale", subject: "subject-algorithmique", description: "Variables, conditions, boucles et méthodes pour résoudre un problème." },
    { title: "Structures de données", subject: "subject-informatique", description: "Listes, tableaux, fichiers et organisation efficace des données." },
    { title: "Python pour le Bac", subject: "subject-informatique", description: "Programmer les exercices classiques du Bac avec Python." },
    { title: "Expression écrite en français", subject: "subject-francais", description: "Construire une réponse claire, structurée et convaincante." },
    { title: "Analyse de texte", subject: "subject-francais", description: "Méthodes pour lire, analyser et commenter un texte littéraire." },
    { title: "English grammar essentials", subject: "subject-anglais", description: "Les structures grammaticales indispensables pour réussir l'épreuve." },
    { title: "English writing practice", subject: "subject-anglais", description: "Améliorer son vocabulaire et rédiger avec confiance en anglais." },
    { title: "الحجاج والتعبير", subject: "subject-arabe", description: "منهجية فهم النصوص وبناء إجابة عربية منظمة." },
    { title: "الحضارات القديمة", subject: "subject-histoire", description: "Repères et méthodes pour analyser les grandes périodes historiques." },
    { title: "Le monde contemporain", subject: "subject-geographie", description: "Territoires, échanges et grands équilibres du monde actuel." },
    { title: "Méthode de dissertation", subject: "subject-philosophie", description: "Construire une problématique et défendre une réflexion personnelle." },
    { title: "Notions clés de philosophie", subject: "subject-philosophie", description: "Travail guidé sur les notions essentielles du programme." },
  ];

  const seededCourses: Array<{ id: string; title: string }> = [];

  for (const [courseIndex, input] of demoCourses.entries()) {
    const subject = subjectCategories[input.subject];
    if (!subject) throw new Error(`Missing seeded subject: ${input.subject}`);

    const course = await db.course.upsert({
      where: { id: `cseedcourse${String(courseIndex + 1).padStart(14, "0")}` },
      update: {
        title: input.title,
        description: input.description,
        profId: professor.id,
        published: true,
      },
      create: {
        id: `cseedcourse${String(courseIndex + 1).padStart(14, "0")}`,
        title: input.title,
        description: input.description,
        profId: professor.id,
        published: true,
      },
    });
    seededCourses.push({ id: course.id, title: course.title });

    await db.courseCategory.upsert({
      where: { courseId_categoryId: { courseId: course.id, categoryId: subject.id } },
      update: { order: 0 },
      create: { courseId: course.id, categoryId: subject.id, order: 0 },
    });

    for (const [chapterIndex, title] of ["Introduction", "Méthode et exemples", "Exercices guidés"].entries()) {
      await db.chapter.upsert({
        where: { courseId_order: { courseId: course.id, order: chapterIndex + 1 } },
        update: {
          title: `${title} — ${input.title}`,
          description: `Chapitre ${chapterIndex + 1} du cours ${input.title}.`,
          videoProvider: "bunny",
          videoId: demoVideoId,
          videoStatus: "READY",
          published: true,
        },
        create: {
          courseId: course.id,
          title: `${title} — ${input.title}`,
          description: `Chapitre ${chapterIndex + 1} du cours ${input.title}.`,
          order: chapterIndex + 1,
          videoProvider: "bunny",
          videoId: demoVideoId,
          videoStatus: "READY",
          published: true,
        },
      });
    }
  }

  const extraSubjects = [
    "subject-mathematiques",
    "subject-physique",
    "subject-chimie",
    "subject-informatique",
    "subject-francais",
    "subject-anglais",
  ];
  for (const [professorIndex, extraProfessor] of extraProfessors.entries()) {
    for (let courseOffset = 0; courseOffset < 3; courseOffset += 1) {
      const courseNumber = professorIndex * 3 + courseOffset + 1;
      const subjectSlug = extraSubjects[(professorIndex + courseOffset) % extraSubjects.length];
      if (!subjectSlug) throw new Error("Missing rotated subject slug.");
      const subject = subjectCategories[subjectSlug];
      if (!subject) throw new Error(`Missing seeded subject: ${subjectSlug}`);

      const title = `${subject.name} — ${extraProfessor.fullName} ${courseOffset + 1}`;
      const course = await db.course.upsert({
        where: { id: `cseedprof${String(courseNumber).padStart(14, "0")}` },
        update: { title, description: `Cours de préparation au Bac animé par ${extraProfessor.fullName}.`, profId: extraProfessor.id, published: true },
        create: { id: `cseedprof${String(courseNumber).padStart(14, "0")}`, title, description: `Cours de préparation au Bac animé par ${extraProfessor.fullName}.`, profId: extraProfessor.id, published: true },
      });
      seededCourses.push({ id: course.id, title: course.title });

      await db.courseCategory.upsert({
        where: { courseId_categoryId: { courseId: course.id, categoryId: subject.id } },
        update: {},
        create: { courseId: course.id, categoryId: subject.id },
      });

      for (const [chapterIndex, chapterTitle] of ["Fondamentaux", "Application", "Préparation examen"].entries()) {
        await db.chapter.upsert({
          where: { courseId_order: { courseId: course.id, order: chapterIndex + 1 } },
          update: { title: `${chapterTitle} — ${title}`, videoId: demoVideoId, videoProvider: "bunny", videoStatus: "READY", published: true },
          create: { courseId: course.id, title: `${chapterTitle} — ${title}`, description: `Chapitre ${chapterIndex + 1} de ${title}.`, order: chapterIndex + 1, videoProvider: "bunny", videoId: demoVideoId, videoStatus: "READY", published: true },
        });
      }
    }
  }

  let existingSubscription = await db.userSubscription.findFirst({
    where: {
      userId: student.id,
      planId: bacPlan.id,
      status: "active",
    },
  });

  if (!existingSubscription) {
    existingSubscription = await db.userSubscription.create({
      data: {
        userId: student.id,
        planId: bacPlan.id,
        bacTypeId: bac.id,
        billingCycle: "month",
        status: "active",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  for (const subjectSlug of ["subject-mathematiques", "subject-physique", "subject-informatique", "subject-francais"]) {
    const subject = subjectCategories[subjectSlug];
    if (subject && existingSubscription) {
      await db.userSubscriptionCategory.upsert({
        where: { subscriptionId_categoryId: { subscriptionId: existingSubscription.id, categoryId: subject.id } },
        update: {},
        create: { subscriptionId: existingSubscription.id, categoryId: subject.id },
      });
    }
  }

  for (const [studentIndex, extraStudent] of extraStudents.entries()) {
    if (studentIndex < 28) {
      const existingStudentSubscription = await db.userSubscription.findFirst({
        where: { userId: extraStudent.id, planId: bacPlan.id, status: "active" },
      });
      const studentSubscription = existingStudentSubscription ?? await db.userSubscription.create({
        data: {
          userId: extraStudent.id,
          planId: bacPlan.id,
          bacTypeId: bac.id,
          billingCycle: studentIndex % 3 === 0 ? "year" : studentIndex % 2 === 0 ? "quarter" : "month",
          status: "active",
          expiresAt: new Date(Date.now() + (30 + studentIndex) * 24 * 60 * 60 * 1000),
        },
      });
      const selectedSubjectSlugs = [
        "subject-mathematiques",
        extraSubjects[studentIndex % extraSubjects.length],
        extraSubjects[(studentIndex + 2) % extraSubjects.length],
      ].filter((subjectSlug): subjectSlug is string => Boolean(subjectSlug));
      for (const subjectSlug of new Set(selectedSubjectSlugs)) {
        const subject = subjectCategories[subjectSlug];
        if (subject) {
          await db.userSubscriptionCategory.upsert({
            where: { subscriptionId_categoryId: { subscriptionId: studentSubscription.id, categoryId: subject.id } },
            update: {},
            create: { subscriptionId: studentSubscription.id, categoryId: subject.id },
          });
        }
      }
    } else {
      const pending = await db.bacAccessRequest.findFirst({ where: { userId: extraStudent.id, planId: bacPlan.id, status: "pending" } });
      if (!pending) {
        await db.bacAccessRequest.create({ data: { userId: extraStudent.id, planId: bacPlan.id, bacTypeId: bac.id, status: "pending" } });
      }
    }
  }

  const pendingRequest = await db.bacAccessRequest.findFirst({
    where: { userId: studentTwo.id, planId: bacPlan.id, status: "pending" },
  });
  if (!pendingRequest) {
    await db.bacAccessRequest.create({
      data: {
        userId: studentTwo.id,
        planId: bacPlan.id,
        bacTypeId: bac.id,
        status: "pending",
      },
    });
  }

  const rejectedRequest = await db.bacAccessRequest.findFirst({
    where: { userId: studentTwo.id, planId: bacPlan.id, status: "rejected" },
  });
  if (!rejectedRequest) {
    await db.bacAccessRequest.create({
      data: {
        userId: studentTwo.id,
        planId: bacPlan.id,
        bacTypeId: bac.id,
        status: "rejected",
        reviewNote: "Please provide a clearer Bac enrollment document.",
        reviewedById: (await db.user.findUniqueOrThrow({ where: { email: adminEmail } })).id,
        reviewedAt: new Date(),
      },
    });
  }

  const tagInputs = [
    { slug: "bac", name: "Bac" },
    { slug: "revision", name: "Révision" },
    { slug: "methodologie", name: "Méthodologie" },
    { slug: "exercices", name: "Exercices" },
  ];
  const tags = [];
  for (const input of tagInputs) {
    tags.push(await db.tag.upsert({ where: { slug: input.slug }, update: { name: input.name }, create: input }));
  }

  const seededChapters = [];
  for (const course of seededCourses) {
    const chapters = await db.chapter.findMany({ where: { courseId: course.id }, orderBy: { order: "asc" } });
    for (const chapter of chapters) {
      seededChapters.push({ ...chapter, courseTitle: course.title });

      for (const tag of tags) {
        await db.courseTag.upsert({
          where: { courseId_tagId: { courseId: course.id, tagId: tag.id } },
          update: {},
          create: { courseId: course.id, tagId: tag.id },
        });
      }

      if (!(await db.videoSection.findFirst({ where: { chapterId: chapter.id, order: 1 } }))) {
        await db.videoSection.createMany({
          data: [
            { chapterId: chapter.id, title: "Les notions essentielles", startSeconds: 0, endSeconds: 180, order: 1 },
            { chapterId: chapter.id, title: "Exemple guidé", startSeconds: 180, endSeconds: 420, order: 2 },
          ],
        });
      }

      if (!(await db.chapterResource.findFirst({ where: { chapterId: chapter.id } }))) {
        await db.chapterResource.create({
          data: {
            chapterId: chapter.id,
            title: `Fiche de révision — ${chapter.title}`,
            kind: "pdf",
            storageKey: `seed/resources/${chapter.id}.pdf`,
            sizeBytes: 245_000,
            contentType: "application/pdf",
            order: 1,
          },
        });
      }

      const quiz = await db.quiz.upsert({
        where: { chapterId: chapter.id },
        update: { title: `Quiz — ${chapter.title}` },
        create: { chapterId: chapter.id, title: `Quiz — ${chapter.title}` },
      });
      const question = await db.question.findFirst({ where: { quizId: quiz.id, order: 1 } });
      const quizQuestion = question ?? await db.question.create({
        data: { quizId: quiz.id, prompt: `Quelle notion est travaillée dans « ${chapter.title} » ?`, order: 1 },
      });
      if (!(await db.answer.findFirst({ where: { questionId: quizQuestion.id } }))) {
        await db.answer.createMany({
          data: [
            { questionId: quizQuestion.id, text: "La notion centrale du chapitre", isCorrect: true },
            { questionId: quizQuestion.id, text: "Une notion hors programme", isCorrect: false },
          ],
        });
      }

      if (!(await db.videoProgress.findUnique({ where: { userId_chapterId: { userId: student.id, chapterId: chapter.id } } }))) {
        await db.videoProgress.create({
          data: { userId: student.id, chapterId: chapter.id, watchedSeconds: chapter.order === 1 ? 240 : 0, completed: chapter.order === 1 },
        });
      }

      for (const [studentIndex, extraStudent] of extraStudents.entries()) {
        if (studentIndex < 28 && (studentIndex + chapter.order + chapter.courseId.length) % 5 === 0) {
          const completed = (studentIndex + chapter.order) % 3 === 0;
          await db.videoProgress.upsert({
            where: { userId_chapterId: { userId: extraStudent.id, chapterId: chapter.id } },
            update: { watchedSeconds: completed ? 420 : 150, completed },
            create: { userId: extraStudent.id, chapterId: chapter.id, watchedSeconds: completed ? 420 : 150, completed },
          });
        }
      }

      if (!(await db.quizAttempt.findFirst({ where: { userId: student.id, quizId: quiz.id } }))) {
        await db.quizAttempt.create({ data: { userId: student.id, quizId: quiz.id, score: chapter.order === 1 ? 85 : 0 } });
      }
    }
  }

  const firstChapter = seededChapters[0];
  const secondChapter = seededChapters[1];
  if (firstChapter && secondChapter) {
    await db.chapterVote.upsert({
      where: { chapterId_userId: { chapterId: firstChapter.id, userId: student.id } },
      update: { value: 1 },
      create: { chapterId: firstChapter.id, userId: student.id, value: 1 },
    });
    const comment = await db.chapterComment.findFirst({ where: { chapterId: firstChapter.id, userId: student.id, parentId: null } });
    if (!comment) {
      const createdComment = await db.chapterComment.create({ data: { chapterId: firstChapter.id, userId: student.id, body: "Très bonne explication, merci pour la méthode !" } });
      await db.chapterComment.create({ data: { chapterId: firstChapter.id, userId: professor.id, parentId: createdComment.id, body: "Merci pour ton retour. Bon courage pour la suite !" } });
    }
    await db.professorRating.upsert({
      where: { professorId_userId: { professorId: professor.id, userId: student.id } },
      update: { rating: 5 },
      create: { professorId: professor.id, userId: student.id, rating: 5 },
    });
    await db.videoProgress.upsert({
      where: { userId_chapterId: { userId: studentTwo.id, chapterId: secondChapter.id } },
      update: { watchedSeconds: 95, completed: false },
      create: { userId: studentTwo.id, chapterId: secondChapter.id, watchedSeconds: 95, completed: false },
    });
  }

  for (const [professorIndex, extraProfessor] of extraProfessors.entries()) {
    const reviewer = extraStudents[professorIndex] ?? student;
    await db.professorRating.upsert({
      where: { professorId_userId: { professorId: extraProfessor.id, userId: reviewer.id } },
      update: { rating: 4 + (professorIndex % 2) },
      create: { professorId: extraProfessor.id, userId: reviewer.id, rating: 4 + (professorIndex % 2) },
    });
  }

  const pfeCategory = await db.category.upsert({
    where: { slug: "pfe-web-development" },
    update: { name: "PFE — Développement web" },
    create: { slug: "pfe-web-development", name: "PFE — Développement web" },
  });
  await db.categoryRelation.upsert({
    where: { parentId_childId: { parentId: pfe.id, childId: pfeCategory.id } },
    update: { order: 0 },
    create: { parentId: pfe.id, childId: pfeCategory.id, order: 0 },
  });

  if (company) {
    const listing = await db.pfeListing.upsert({
      where: { id: "seed-pfe-listing-1" },
      update: { title: "Plateforme web pour l'éducation", description: "Construire une plateforme moderne de suivi des apprentissages.", location: "Tunis" },
      create: { id: "seed-pfe-listing-1", companyId: company.id, categoryId: pfeCategory.id, title: "Plateforme web pour l'éducation", description: "Construire une plateforme moderne de suivi des apprentissages.", location: "Tunis" },
    });
    await db.pfeApplication.upsert({
      where: { listingId_studentId: { listingId: listing.id, studentId: student.id } },
      update: { status: "pending" },
      create: { listingId: listing.id, studentId: student.id, status: "pending" },
    });
  }

  const pack = await db.pack.upsert({
    where: { slug: "revision-bac-complete" },
    update: { name: "Révision Bac complète", description: "Un pack de démonstration avec plusieurs matières.", priceCents: 9900 },
    create: { slug: "revision-bac-complete", name: "Révision Bac complète", description: "Un pack de démonstration avec plusieurs matières.", priceCents: 9900 },
  });
  if (seededCourses[0]) {
    await db.packItem.upsert({ where: { packId_courseId: { packId: pack.id, courseId: seededCourses[0].id } }, update: {}, create: { packId: pack.id, courseId: seededCourses[0].id } });
  }
  const mathsSubject = subjectCategories["subject-mathematiques"];
  const informatiqueSubject = subjectCategories["subject-informatique"];
  if (!mathsSubject || !informatiqueSubject) throw new Error("Required seeded subjects are missing.");
  await db.packItem.upsert({ where: { packId_categoryId: { packId: pack.id, categoryId: mathsSubject.id } }, update: {}, create: { packId: pack.id, categoryId: mathsSubject.id } });
  await db.packEnrollment.upsert({
    where: { userId_packId: { userId: student.id, packId: pack.id } },
    update: { status: "active", source: "complimentary" },
    create: { userId: student.id, packId: pack.id, status: "active", source: "complimentary" },
  });

  const application = await db.profApplication.findFirst({ where: { applicantId: studentTwo.id } });
  if (!application) {
    const createdApplication = await db.profApplication.create({
      data: {
        applicantId: studentTwo.id,
        fullName: studentTwo.fullName,
        dateOfBirth: new Date("2004-05-12"),
        phone: "+216 22 000 002",
        institution: "Université de Tunis",
        institutionType: "University",
        experienceRange: "1-3 years",
        qualification: "Licence en informatique",
        message: "Je souhaite partager mes méthodes de programmation.",
        identityDocumentKey: "seed/applications/student2-id.pdf",
        qualificationProofKey: "seed/applications/student2-qualification.pdf",
        status: "pending",
      },
    });
    await db.profApplicationCategory.create({ data: { applicationId: createdApplication.id, categoryId: informatiqueSubject.id } });
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
