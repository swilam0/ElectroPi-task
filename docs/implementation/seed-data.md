# Seed Data

## Overview

Seed data provides a realistic starting state for development and testing. It creates users, projects, memberships, and tasks that mirror a real-world scenario.

## Seed Script (`prisma/seeds/seed.ts`)

```typescript
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
```

## Seeded Data Summary

### Users

| Name | Email | Role | Default Password |
|------|-------|------|------------------|
| Alice Admin | admin@taskflow.com | ADMIN | Password123! |
| Bob Builder | bob@taskflow.com | MEMBER | Password123! |
| Carol Coder | carol@taskflow.com | MEMBER | Password123! |

### Projects

| Title | Created By | Members |
|-------|-----------|---------|
| Website Redesign | Alice Admin | Alice, Bob, Carol |
| Mobile App MVP | Bob Builder | Bob, Alice |

### Tasks

| Title | Project | Status | Priority | Assignee | Due Date |
|-------|---------|--------|----------|----------|----------|
| Design homepage mockup | Website Redesign | TODO | HIGH | Carol Coder | 2026-08-15 |
| Implement auth flow | Website Redesign | IN_PROGRESS | HIGH | Bob Builder | 2026-08-10 |
| Set up CI/CD pipeline | Website Redesign | DONE | MEDIUM | Bob Builder | 2026-07-25 |
| API endpoint for user profiles | Mobile App MVP | TODO | MEDIUM | *Unassigned* | 2026-09-01 |
| Push notification integration | Mobile App MVP | IN_PROGRESS | LOW | Bob Builder | 2026-09-15 |

## Seed Configuration

In `backend/package.json`, configure the seed script:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seeds/seed.ts"
  }
}
```

Run with:

```bash
npx prisma db seed
```

## Resetting Data

To reset the database and re-seed:

```bash
npx prisma migrate reset --force   # Drops, migrates, and seeds
```

Or manually:

```bash
npx prisma migrate deploy
npx prisma db seed
```
