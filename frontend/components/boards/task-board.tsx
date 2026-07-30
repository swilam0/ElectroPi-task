"use client";

import { useProjectTasks } from "@/hooks/use-tasks";
import { TaskCard } from "./task-card";
import { Spinner } from "@/components/ui/spinner";
import type { TaskStatus } from "@/types/task";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

export function TaskBoard({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useProjectTasks(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">Failed to load tasks.</p>
    );
  }

  const tasks = data?.data ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className="rounded-lg bg-gray-50 p-3">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              {col.label}
              <span className="ml-2 text-gray-400">({columnTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {columnTasks.length === 0 ? (
                <p className="text-xs text-gray-400">No tasks</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
