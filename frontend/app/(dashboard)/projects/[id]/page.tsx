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
        <Link href="/projects" className="text-sm text-blue-600 hover:underline">
          &larr; Back to projects
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
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

      <div className="flex gap-2">
        <Link href={`/projects/${project.id}/settings`}>
          <Button variant="secondary" size="sm">Settings</Button>
        </Link>
        <Link href={`/projects/${project.id}/members`}>
          <Button variant="secondary" size="sm">Members</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Members</h2>
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <Button size="sm" onClick={() => setShowAddTask(true)}>
            Add Task
          </Button>
        </div>
        <TaskBoard projectId={project.id} />
        {showAddTask && (
          <AddTaskModal
            projectId={project.id}
            members={project.members}
            onClose={() => setShowAddTask(false)}
          />
        )}
      </div>
    </div>
  );
}
