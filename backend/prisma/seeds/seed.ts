import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // ─── Users ───────────────────────────────────────────

  const alice = await prisma.user.create({
    data: {
      email: 'admin@taskflow.com',
      password: passwordHash,
      name: 'Alice Admin',
      role: 'ADMIN',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@taskflow.com',
      password: passwordHash,
      name: 'Bob Builder',
      role: 'MEMBER',
    },
  });
 
  const carol = await prisma.user.create({
    data: {
      email: 'carol@taskflow.com',
      password: passwordHash,
      name: 'Carol Coder',
      role: 'MEMBER',
    },
  });

  // ─── Projects ────────────────────────────────────────

  const websiteRedesign = await prisma.project.create({
    data: {
      title: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern design principles, improved UX, and mobile responsiveness.',
      createdById: alice.id,
    },
  });

  const mobileApp = await prisma.project.create({
    data: {
      title: 'Mobile App MVP',
      description: 'Build a minimum viable product for the mobile application with core features.',
      createdById: bob.id,
    },
  });

  // ─── Project Memberships ─────────────────────────────

  // Website Redesign: Alice (admin), Bob, Carol
  await prisma.projectMember.createMany({
    data: [
      { userId: alice.id, projectId: websiteRedesign.id },
      { userId: bob.id, projectId: websiteRedesign.id },
      { userId: carol.id, projectId: websiteRedesign.id },
    ],
  });

  // Mobile App MVP: Bob (creator), Alice (admin)
  await prisma.projectMember.createMany({
    data: [
      { userId: bob.id, projectId: mobileApp.id },
      { userId: alice.id, projectId: mobileApp.id },
    ],
  });

  // ─── Tasks ───────────────────────────────────────────

  // Website Redesign tasks
  await prisma.task.create({
    data: {
      title: 'Design homepage mockup',
      description: 'Create wireframes and high-fidelity mockups for the new homepage layout.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-08-15'),
      projectId: websiteRedesign.id,
      createdById: alice.id,
      assigneeId: carol.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Implement auth flow',
      description: 'Add JWT authentication with refresh tokens, login, register, and logout pages.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date('2026-08-10'),
      projectId: websiteRedesign.id,
      createdById: alice.id,
      assigneeId: bob.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing, linting, and deployment.',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: new Date('2026-07-25'),
      projectId: websiteRedesign.id,
      createdById: alice.id,
      assigneeId: bob.id,
    },
  });

  // Mobile App MVP tasks
  await prisma.task.create({
    data: {
      title: 'API endpoint for user profiles',
      description: 'Implement RESTful API endpoints for user profile CRUD operations.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date('2026-09-01'),
      projectId: mobileApp.id,
      createdById: bob.id,
      assigneeId: null, // Unassigned
    },
  });

  await prisma.task.create({
    data: {
      title: 'Push notification integration',
      description: 'Integrate push notification service for real-time alerts on task updates.',
      status: 'IN_PROGRESS',
      priority: 'LOW',
      dueDate: new Date('2026-09-15'),
      projectId: mobileApp.id,
      createdById: bob.id,
      assigneeId: bob.id,
    },
  });

  console.log('Seed data inserted successfully.');
  console.log(`  Users:     ${3}`);
  console.log(`  Projects:  ${2}`);
  console.log(`  Tasks:     ${5}`);
  console.log('---');
  console.log('Default password for all users: Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
