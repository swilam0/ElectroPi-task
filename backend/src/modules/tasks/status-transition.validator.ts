import { BadRequestException, ForbiddenException } from '@nestjs/common';

export class StatusTransitionValidator {
  validate(
    currentStatus: string,
    newStatus: string,
    userRole: string,
    userId: string,
    taskCreatorId: string,
    taskAssigneeId: string | null,
  ): void {
    if (currentStatus === newStatus) return;

    if (currentStatus === 'TODO' && newStatus === 'DONE') {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid status transition',
        code: 'T-003',
      });
    }

    const allowedTransitions: Record<string, string[]> = {
      TODO: ['IN_PROGRESS'],
      IN_PROGRESS: ['TODO', 'DONE'],
      DONE: ['TODO', 'IN_PROGRESS'],
    };

    const next = allowedTransitions[currentStatus];
    if (!next || !next.includes(newStatus)) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid status transition',
        code: 'T-003',
      });
    }

    if (currentStatus === 'DONE' && userRole !== 'ADMIN') {
      throw new ForbiddenException({
        status: 'error',
        message: 'Not authorized to change task status',
        code: 'T-004',
      });
    }

    if (userRole !== 'ADMIN') {
      const isCreatorOrAssignee =
        userId === taskCreatorId || (taskAssigneeId !== null && userId === taskAssigneeId);
      if (!isCreatorOrAssignee) {
        throw new ForbiddenException({
          status: 'error',
          message: 'Not authorized to change task status',
          code: 'T-004',
        });
      }
    }

    const needsAssignee = ['TODO:IN_PROGRESS', 'IN_PROGRESS:DONE'];
    if (needsAssignee.includes(`${currentStatus}:${newStatus}`) && !taskAssigneeId) {
      throw new BadRequestException({
        status: 'error',
        message: 'Cannot start a task without an assignee',
        code: 'T-005',
      });
    }
  }
}
