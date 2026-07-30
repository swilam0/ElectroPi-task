import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import Link from "next/link";

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

export function TaskCard({ task }: { task: Task }) {
  return (
    <Link href={`/projects/${task.projectId}/tasks/${task.id}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          {task.title}
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              priorityColors[task.priority]
            )}
          >
            {task.priority}
          </span>
          {task.assignee && (
            <span className="text-xs text-gray-500">
              {task.assignee.name}
            </span>
          )}
          {task.dueDate && (
            <span className="text-xs text-gray-400">
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
