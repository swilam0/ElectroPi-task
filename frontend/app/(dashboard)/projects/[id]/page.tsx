"use client";

import { useProject } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TaskBoard } from "@/components/boards/task-board";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AddTaskModal } from "./add-task-modal";
import { Settings } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, error } = useProject(id);
  const [showAddTask, setShowAddTask] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const apiErr = error as { status?: string; code?: string; message?: string };
    if (apiErr.code === "P-001") {
      return (
        <Card>
          <CardContent>
            <p className="text-red-600">You are not a member of this project.</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <p className="text-red-600">Failed to load project.</p>
    );
  }

  const project = data?.data;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/projects" label="Back to projects" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          <Link href={`/projects/${project.id}/settings`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50">
            <Settings className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            <p>settings</p>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">
            {project.description || "No description"}
          </p>
          <p className="text-sm text-gray-400">
            Created by {project.creator.name} &middot;{" "}
            {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <Button size="sm" onClick={() => setShowAddTask(true)}>
            Add Task
          </Button>
        </div>
        <TaskBoard projectId={project.id} members={project.members} />
        {showAddTask && (
          <AddTaskModal
            projectId={project.id}
            members={project.members}
            onClose={() => setShowAddTask(false)}
          />
        )}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Members</h2>
          <Link href={`/projects/${project.id}/members`}>
            <Button variant="primary" size="sm">Manage</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {project.members.length === 0 ? (
            <p className="text-sm text-gray-500">No members.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {project.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
