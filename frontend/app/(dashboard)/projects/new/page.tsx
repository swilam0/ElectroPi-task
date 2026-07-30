"use client";

import { useCreateProject } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await createProject.mutateAsync({
        title,
        description: description || undefined,
      });
      if (result.status === "success") {
        router.push(`/projects/${result.data.id}`);
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || "Failed to create project");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackButton href="/projects" label="Back to projects" />
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">New Project</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="title"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Project name"
            />
            <Textarea
              id="description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={4}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => router.push("/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
