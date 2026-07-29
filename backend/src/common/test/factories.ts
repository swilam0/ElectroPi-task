import { randomUUID } from 'crypto';

export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    email: 'test@example.com',
    password: '$2b$12$abcdefghijklmnopqrstuvwxyz12345678901234567890',
    name: 'Test User',
    role: 'MEMBER',
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockProject(overrides: Record<string, unknown> = {}) {
  const creator = { id: randomUUID(), name: 'Alice Admin' };
  return {
    id: randomUUID(),
    title: 'Test Project',
    description: 'A test project',
    createdById: creator.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: creator,
    _count: { members: 3, tasks: 5 },
    members: [],
    ...overrides,
  };
}

export function createMockProjectMember(overrides: Record<string, unknown> = {}) {
  const user = createMockUser();
  return {
    id: randomUUID(),
    userId: user.id,
    projectId: randomUUID(),
    joinedAt: new Date('2026-01-01'),
    user,
    ...overrides,
  };
}

export function createMockTask(overrides: Record<string, unknown> = {}) {
  const creator = { id: randomUUID(), name: 'Alice Admin' };
  const assignee = { id: randomUUID(), name: 'Bob Builder' };
  return {
    id: randomUUID(),
    title: 'Test Task',
    description: 'A test task',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date('2026-06-01'),
    projectId: randomUUID(),
    createdById: creator.id,
    assigneeId: assignee.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    creator,
    assignee,
    project: createMockProject(),
    ...overrides,
  };
}

export function createMockRefreshToken(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    tokenHash: 'a'.repeat(64),
    userId: randomUUID(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}
