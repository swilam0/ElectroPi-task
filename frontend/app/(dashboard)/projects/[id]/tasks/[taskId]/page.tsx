"use client";

import { useTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useProject } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { TaskStatus, Priority } from "@/types/task";

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

const STATUS_OPTIONS = [
  { value: "TODO", label: "Todo" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

function getAllowedStatuses(
  currentStatus: TaskStatus,
  userRole: string | undefined
): TaskStatus[] {
  switch (currentStatus) {
    case "TODO":
      return ["TODO", "IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["TODO", "IN_PROGRESS", "DONE"];
    case "DONE":
      if (userRole === "ADMIN") {
        return ["DONE", "TODO", "IN_PROGRESS"];
      }
      return ["DONE"];
    default:
      return [currentStatus];
  }
}

function validateTransition(
  from: TaskStatus,
  to: TaskStatus,
  assigneeId: string | null | undefined,
  currentAssigneeId: string | null | undefined,
  userRole: string | undefined
): string | null {
  if (from === to) return null;

  if (from === "TODO" && to === "DONE") {
    return "Cannot move from TODO directly to DONE.";
  }

  if (from === "TODO" && to === "IN_PROGRESS" && !assigneeId && !currentAssigneeId) {
    return "Task must be assigned before moving to IN_PROGRESS.";
  }

  if (from === "DONE" && userRole !== "ADMIN") {
    return "Only admins can reopen completed tasks.";
  }

  return null;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const projectId = params.id as string;
  const { data: taskData, isLoading: taskLoading, error: taskError } = useTask(taskId);
  const { data: projectData } = useProject(projectId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const today = new Date().toISOString().split("T")[0];
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState("");

  const task = taskData?.data;
  const project = projectData?.data;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setAssigneeId(task.assignee?.id || "");
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setFormError("");
    }
  }, [task?.id]);

  const user = getUser();
  const member = project?.members.find((m) => m.id === user?.id);
  const userRole = member?.role;

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (taskError || !task) {
    return <p className="text-red-600">Failed to load task.</p>;
  }

  const allowedStatuses = getAllowedStatuses(status, userRole);

  const handleStatusChange = (newStatus: string) => {
    setFormError("");
    const err = validateTransition(
      status,
      newStatus as TaskStatus,
      assigneeId,
      task.assignee?.id,
      userRole
    );
    if (err) {
      setFormError(err);
      return;
    }
    setStatus(newStatus as TaskStatus);
  };

  const handleSave = async () => {
    setFormError("");
    try {
      await updateTask.mutateAsync({
        taskId,
        data: {
          title,
          description: description || undefined,
          priority,
          status,
          dueDate: dueDate || undefined,
          assigneeId: assigneeId || null,
        },
      });
      setIsEditing(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to update task.");
    }
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);
    setAssigneeId(task.assignee?.id || "");
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setFormError("");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask.mutateAsync({ taskId });
      router.push(`/projects/${projectId}`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to delete task.");
    }
  };

  const members = project?.members || [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <BackButton href={`/projects/${projectId}`} label="Back to project" />
        <div className="flex gap-2">
          {!isEditing && (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            disabled={deleteTask.isPending}
          >
            {deleteTask.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            {isEditing ? (
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-bold"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                priorityColors[task.priority]
              )}
            >
              {task.priority}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <Input
                id="edit-description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="No description"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="edit-status"
                  label="Status"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={allowedStatuses.map((s) => ({
                    value: s,
                    label: STATUS_OPTIONS.find((o) => o.value === s)?.label || s,
                  }))}
                />
                <Select
                  id="edit-priority"
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  options={[
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                  ]}
                />
                <Select
                  id="edit-assignee"
                  label="Assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...members.map((m) => ({
                      value: m.id,
                      label: m.name,
                    })),
                  ]}
                />
                <Input
                  id="edit-dueDate"
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={today}
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateTask.isPending}>
                  {updateTask.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600">
                  {task.description || "No description"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status</span>
                  <p className="font-medium text-gray-900">
                    {task.status.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Priority</span>
                  <p className="font-medium text-gray-900">{task.priority}</p>
                </div>
                <div>
                  <span className="text-gray-500">Assignee</span>
                  <p className="font-medium text-gray-900">
                    {task.assignee?.name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Due Date</span>
                  <p className="font-medium text-gray-900">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "No due date"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Created by</span>
                  <p className="font-medium text-gray-900">
                    {task.creator.name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium text-gray-900">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Updated</span>
                  <p className="font-medium text-gray-900">
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
