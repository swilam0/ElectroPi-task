"use client";

import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectsListPage() {
  const { data, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-600">Failed to load projects.</p>
    );
  }

  const projects = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Link href="/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-gray-500">No projects yet. Create your first project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">{project.title}</h2>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-gray-500 line-clamp-2">
                    {project.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{project.memberCount} member{project.memberCount !== 1 ? "s" : ""}</span>
                    <span>{project.taskCount} task{project.taskCount !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Created by {project.creator.name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
