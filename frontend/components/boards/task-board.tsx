"use client";

import { useProjectTasks, useUpdateTask } from "@/hooks/use-tasks";
import { TaskCard } from "./task-card";
import { Select } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { getUser } from "@/lib/auth";
import type { TaskStatus, Priority, TaskFilters, Task } from "@/types/task";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

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

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

function DroppableColumn({
  id,
  label,
  count,
  children,
  disabled,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg bg-gray-50 p-3 transition-colors",
        isOver && !disabled && "bg-blue-50 ring-2 ring-blue-300",
        disabled && "opacity-30"
      )}
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {label}
        <span className="ml-2 text-gray-400">({count})</span>
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function TaskBoard({
  projectId,
  members,
}: {
  projectId: string;
  members: { id: string; name: string }[];
}) {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filters: TaskFilters = {};
  if (status) filters.status = status as TaskStatus;
  if (priority) filters.priority = priority as Priority;
  if (assigneeId) filters.assigneeId = assigneeId;

  const { data, isLoading, error } = useProjectTasks(projectId, filters);
  const hasFilters = status || priority || assigneeId;

  const currentUser = getUser();
  const role = currentUser?.role ?? "MEMBER";
  const updateTask = useUpdateTask();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingMoveIds, setPendingMoveIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const targetStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    const validTransitions = getValidTransitions(task.status, role);

    if (!validTransitions.includes(targetStatus)) {
      useUiStore.getState().addToast({
        type: "error",
        message: `Cannot move from ${task.status.replace("_", " ")} to ${targetStatus.replace("_", " ")}.`,
      });
      return;
    }

    setPendingMoveIds((prev) => new Set(prev).add(taskId));
    try {
      await updateTask.mutateAsync({ taskId, data: { status: targetStatus } });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      useUiStore.getState().addToast({
        type: "error",
        message: apiErr.message || "Failed to move task.",
      });
    } finally {
      setPendingMoveIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const clearFilters = () => {
    setStatus("");
    setPriority("");
    setAssigneeId("");
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((col) => (
          <div key={col} className="rounded-lg bg-gray-50 p-3">
            <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-200" />
            {[1, 2, 3].map((card) => (
              <div key={card} className="mb-2 h-20 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        ))}
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
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          id="filter-status"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "TODO", label: "TODO" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "DONE", label: "Done" },
          ]}
        />
        <Select
          id="filter-priority"
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
          ]}
        />
        <div ref={assigneeRef} className="w-48">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Assignee
          </label>
          <input
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search members..."
            value={
              showAssigneeDropdown
                ? assigneeSearch
                : assigneeId
                  ? members.find((m) => m.id === assigneeId)?.name || ""
                  : ""
            }
            onFocus={() => {
              setShowAssigneeDropdown(true);
              setAssigneeSearch("");
            }}
            onChange={(e) => setAssigneeSearch(e.target.value)}
          />
          {showAssigneeDropdown && (
            <div className="absolute z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
              <button
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  setAssigneeId("");
                  setShowAssigneeDropdown(false);
                }}
              >
                All
              </button>
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setAssigneeId(m.id);
                    setShowAssigneeDropdown(false);
                  }}
                >
                  {m.name}
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
              )}
            </div>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-md px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            return (
              <DroppableColumn
                key={col.id}
                id={col.id}
                label={col.label}
                count={columnTasks.length}
                disabled={
                  !!activeTask &&
                  !getValidTransitions(activeTask.status, role).includes(col.id)
                }
              >
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-gray-300">
                    <Inbox className="mb-2 h-8 w-8" />
                    <p className="text-xs">No tasks</p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} dimmed={pendingMoveIds.has(task.id)} />
                  ))
                )}
              </DroppableColumn>
            );
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div
              className={cn(
                "rounded-lg border border-gray-200 bg-white p-3 shadow-xl w-72 border-l-4",
                activeTask.priority === "HIGH" && "border-l-red-500",
                activeTask.priority === "MEDIUM" && "border-l-yellow-500",
                activeTask.priority === "LOW" && "border-l-green-500"
              )}
            >
              <h4 className="text-sm font-semibold text-gray-900">
                {activeTask.title}
              </h4>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    priorityColors[activeTask.priority]
                  )}
                >
                  {activeTask.priority}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
