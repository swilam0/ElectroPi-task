"use client";

import { useProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUser } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { useUiStore } from "@/stores/ui-store";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, error } = useProject(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "ADMIN";

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

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(id);
      setShowDeleteModal(false);
      useUiStore.getState().addToast({ type: "success", message: "Project deleted successfully." });
      router.push("/projects");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      useUiStore.getState().addToast({ type: "error", message: apiErr.message || "Failed to delete project." });
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <BackButton href={`/projects/${id}`} label="Back to project" />
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

      {isAdmin && (
        <Card className="mt-6 border-red-500">
          <CardHeader>
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              This action cannot be undone. All tasks and members will be permanently deleted.
            </p>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Project
            </Button>
          </CardContent>
        </Card>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Delete Project</h2>
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmName(""); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this project? Type the project name to confirm.
              </p>
              <Input
                id="confirm-name"
                label="Project name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={project.title}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowDeleteModal(false); setConfirmName(""); }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={confirmName !== project.title || deleteProject.isPending}
                  onClick={handleDelete}
                >
                  {deleteProject.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
