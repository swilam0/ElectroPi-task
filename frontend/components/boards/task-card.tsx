"use client";

import type { Task, TaskStatus } from "@/types/task";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { getUser } from "@/lib/auth";
import { Trash2, Pencil, Circle, Check, Eye } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { useDraggable } from "@dnd-kit/core";

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: "TODO",
  IN_PROGRESS: "IN PROGRESS",
  DONE: "DONE",
};

function getValidTransitions(status: TaskStatus, role: string): TaskStatus[] {
  if (role === "ADMIN") {
    switch (status) {
      case "TODO":
        return ["IN_PROGRESS"];
      case "IN_PROGRESS":
        return ["TODO", "DONE"];
      case "DONE":
        return ["TODO", "IN_PROGRESS"];
    }
  } else {
    switch (status) {
      case "TODO":
        return ["IN_PROGRESS"];
      case "IN_PROGRESS":
        return ["TODO", "DONE"];
      case "DONE":
        return [];
    }
  }
}

export function TaskCard({ task, dimmed }: { task: Task; dimmed?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuVertical, setMenuVertical] = useState<"above" | "below">("below");
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      cardRef.current = node;
    },
    [setNodeRef]
  );
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const currentUser = getUser();
  const role = currentUser?.role ?? "MEMBER";

  const validTransitions = getValidTransitions(task.status, role);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowDeleteConfirm(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === task.status) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, data: { status: newStatus } });
      setMenuOpen(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      useUiStore.getState().addToast({ type: "error", message: apiErr.message || "Failed to update status." });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync({ taskId: task.id });
      setMenuOpen(false);
      setShowDeleteConfirm(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      useUiStore.getState().addToast({ type: "error", message: apiErr.message || "Failed to delete task." });
    }
  };

  const allStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

  return (
    <div ref={mergedRef} {...listeners} {...attributes} className={cn(
      "relative cursor-grab active:cursor-grabbing rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md border-l-4",
      (isDragging || dimmed) && "opacity-50",
      task.priority === "HIGH" && "border-l-red-500",
      task.priority === "MEDIUM" && "border-l-yellow-500",
      task.priority === "LOW" && "border-l-green-500",
    )}>
      <div
        className="cursor-pointer p-3"
        onClick={(e) => {
          e.stopPropagation();
          if (menuOpen) {
            setMenuOpen(false);
            return;
          }
          const rect = cardRef.current!.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const vertical = spaceBelow < 200 && spaceAbove > spaceBelow ? "above" : "below";
          setMenuVertical(vertical);
          setMenuOpen(true);
          setShowDeleteConfirm(false);
        }}
      >
        <h4 className="mb-2 pr-6 text-sm font-semibold text-gray-900">
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

      {menuOpen && (
        <div
          ref={menuRef}
          className={cn(
            "absolute z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-xl",
            menuVertical === "below" ? "top-full mt-1" : "bottom-full mb-1",
            "right-2",
          )}
        >
          <div className="border-b border-gray-100 p-1">
            <div className="px-2 py-1.5 text-xs font-medium uppercase text-gray-400">
              Move to
            </div>
            {allStatuses.map((s) => {
              const isCurrent = s === task.status;
              const isDisabled = !isCurrent && !validTransitions.includes(s);
              return (
                <button
                  key={s}
                  disabled={isDisabled}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors",
                    isCurrent && "font-semibold",
                    !isCurrent && !isDisabled && "hover:bg-gray-100",
                    isDisabled && "cursor-not-allowed",
                    s === "TODO" && (isCurrent ? "text-gray-800" : "text-gray-600"),
                    s === "IN_PROGRESS" && (isCurrent ? "text-blue-700" : "text-gray-600"),
                    s === "DONE" && (isCurrent ? "text-green-700" : "text-gray-600"),
                  )}
                >
                  <Circle className={cn(
                    "h-3 w-3 shrink-0 fill-current",
                    isDisabled && "text-gray-300",
                    !isDisabled && s === "TODO" && "text-gray-400",
                    !isDisabled && s === "IN_PROGRESS" && "text-blue-500",
                    !isDisabled && s === "DONE" && "text-green-500",
                  )} />
                  <span className="flex-1">{statusLabels[s]}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          <div className="p-1">
            {!showDeleteConfirm ? (
              <>
                <Link
                  href={`/projects/${task.projectId}/tasks/${task.id}`}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  <Eye className="h-3.5 w-3.5 text-gray-400" />
                  View task
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </>
            ) : (
              <div className="space-y-1 px-2 py-1">
                <p className="text-xs text-gray-500">Delete this task?</p>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={deleteTask.isPending}
                    className="flex-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteTask.isPending ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
