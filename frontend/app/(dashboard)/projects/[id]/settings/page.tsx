"use client";

import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, error } = useProject(id);
  const updateProject = useUpdateProject();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (data?.data) {
      setTitle(data.data.title);
      setDescription(data.data.description || "");
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const apiErr = error as { status?: string; code?: string };
    if (apiErr.code === "P-001") {
      return (
        <Card>
          <CardContent>
            <p className="text-red-600">You are not a member of this project.</p>
          </CardContent>
        </Card>
      );
    }
    return <p className="text-red-600">Failed to load project.</p>;
  }

  const project = data?.data;
  if (!project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await updateProject.mutateAsync({ id, data: { title, description: description || undefined } });
      router.push(`/projects/${id}`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to update project");
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to project
        </Link>
      </div>
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">Project Settings</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="title"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              id="description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            {updateProject.isSuccess && (
              <p className="text-sm text-green-600">Project updated.</p>
            )}
            <Button type="submit" className="w-full" disabled={updateProject.isPending}>
              {updateProject.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
