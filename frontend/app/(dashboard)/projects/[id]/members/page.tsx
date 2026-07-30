"use client";

import { useProject, useAddMember, useRemoveMember } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { getUser } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Trash2 } from "lucide-react";

export default function ProjectMembersPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, error } = useProject(id);
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "ADMIN";

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

  const creatorId = project.creator.id;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFormError("");
    try {
      await addMember.mutateAsync({ projectId: id, data: { email: email.trim() } });
      setEmail("");
    } catch (err: unknown) {
      const apiErr = err as { message?: string; code?: string };
      if (apiErr.code === "Z-001") {
        setFormError("Only admins can add members.");
      } else if (apiErr.code === "U-001") {
        setFormError("User not found.");
      } else if (apiErr.code === "P-003") {
        setFormError("User is already a member.");
      } else {
        setFormError(apiErr.message || "Failed to add member.");
      }
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member from the project?")) return;
    try {
      await removeMember.mutateAsync({ projectId: id, userId: memberId });
    } catch (err: unknown) {
      const apiErr = err as { message?: string; code?: string };
      if (apiErr.code === "Z-001") {
        setFormError("Only admins can remove members.");
      } else if (apiErr.code === "P-004") {
        setFormError("Cannot remove the project creator.");
      } else {
        setFormError(apiErr.message || "Failed to remove member.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <BackButton href={`/projects/${id}`} label="Back to project" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">Members</h1>
        </CardHeader>
        <CardContent>
          {project.members.length === 0 ? (
            <p className="text-sm text-gray-500">No members.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {project.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.name}
                      {member.id === creatorId && (
                        <span className="ml-2 text-xs text-gray-400">(creator)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {member.role}
                    </span>
                    {isAdmin && member.id !== creatorId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter the user email to add"
              />
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              {addMember.isSuccess && (
                <p className="text-sm text-green-600">Member added.</p>
              )}
              <Button type="submit" disabled={addMember.isPending || !email.trim()}>
                {addMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
