import prisma from "./index";

async function seed() {
  console.log("Seeding database...");

  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Corp",
      plan: "team",
      githubInstallationId: "12345678",
      autonomyLevel: "auto-pr",
      maxRetriesPerTask: 3,
      allowedModules: ["backend", "frontend", "api"],
      blockedModules: ["auth", "billing"],
      monthlyBudgetCents: 100000,
    },
  });

  console.log("Created tenant:", tenant.id);

  const repo = await prisma.repository.create({
    data: {
      tenantId: tenant.id,
      fullName: "acme/web-app",
      defaultBranch: "main",
      language: "typescript",
    },
  });

  console.log("Created repository:", repo.id);

  await prisma.apiKey.create({
    data: {
      tenantId: tenant.id,
      key: "ak_dev_test_key_12345",
      name: "Development Key",
    },
  });

  const task = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      repositoryId: repo.id,
      issueNumber: 42,
      title: "Fix login redirect bug",
      body: "Users are not redirected after login on mobile devices.",
      type: "bug",
      riskLevel: "medium",
      status: "completed",
      currentIteration: 2,
    },
  });

  await prisma.execution.createMany({
    data: [
      {
        taskId: task.id,
        tenantId: tenant.id,
        step: "triage",
        status: "success",
        durationMs: 1200,
        costCents: 2,
      },
      {
        taskId: task.id,
        tenantId: tenant.id,
        step: "plan",
        status: "success",
        durationMs: 8500,
        costCents: 15,
      },
      {
        taskId: task.id,
        tenantId: tenant.id,
        step: "code",
        status: "success",
        durationMs: 12000,
        costCents: 25,
      },
      {
        taskId: task.id,
        tenantId: tenant.id,
        step: "review",
        status: "failed",
        durationMs: 6000,
        costCents: 10,
      },
      {
        taskId: task.id,
        tenantId: tenant.id,
        step: "fix",
        status: "success",
        durationMs: 9000,
        costCents: 20,
      },
      {
        taskId: task.id,
        tenantId: tenant.id,
        step: "review",
        status: "success",
        durationMs: 5000,
        costCents: 10,
      },
    ],
  });

  console.log("Seed completed.");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
