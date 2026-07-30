"use client";

import {
  useUser,
  useUpdateUser,
  useChangeRole,
  useChangePassword,
  useDeleteUser,
} from "@/hooks/use-users";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { getUser } from "@/lib/auth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui/back-button";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, error } = useUser(id);
  const updateUser = useUpdateUser();
  const changeRole = useChangeRole();
  const changePassword = useChangePassword();
  const deleteUser = useDeleteUser();

  const currentUser = getUser();
  const isSelf = currentUser?.id === id;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState("");

  const user = data?.data;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
    }
  }, [user?.id]);

  if (currentUser?.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-600">Access denied. Admin only.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return <p className="text-red-600">Failed to load user.</p>;
  }

  const handleSaveProfile = async () => {
    setFormError("");
    try {
      await updateUser.mutateAsync({ id, data: { name, email } });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to update profile.");
    }
  };

  const handleChangeRole = async (newRole: string) => {
    if (isSelf) {
      setFormError("You cannot change your own role.");
      return;
    }
    setFormError("");
    setRole(newRole);
    try {
      await changeRole.mutateAsync({
        id,
        data: { role: newRole as "ADMIN" | "MEMBER" },
      });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to change role.");
      setRole(user.role);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return;
    setFormError("");
    try {
      await changePassword.mutateAsync({ id, data: { newPassword } });
      setNewPassword("");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to reset password.");
    }
  };

  const handleDelete = async () => {
    if (isSelf) {
      setFormError("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${user.name}"?`))
      return;
    setFormError("");
    try {
      await deleteUser.mutateAsync({ id });
      router.push("/admin/users");
    } catch (err: unknown) {
      const apiErr = err as { message?: string; code?: string };
      if (apiErr.code === "U-002") {
        setFormError(
          "Cannot delete: user has active projects. Delete or transfer them first."
        );
      } else {
        setFormError(apiErr.message || "Failed to delete user.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <BackButton href="/admin/users" label="Back to users" />
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Profile
            </h2>
            <Input
              id="edit-name"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              id="edit-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Role
            </h2>
            <Select
              id="edit-role"
              label="User Role"
              value={role}
              onChange={(e) => handleChangeRole(e.target.value)}
              options={[
                { value: "ADMIN", label: "Admin" },
                { value: "MEMBER", label: "Member" },
              ]}
            />
            {isSelf && (
              <p className="text-xs text-gray-500">
                You cannot change your own role.
              </p>
            )}
          </div>

          <hr className="border-gray-200" />

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Reset Password
            </h2>
            <Input
              id="reset-password"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 letter, 1 number"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleResetPassword}
                disabled={changePassword.isPending || !newPassword}
              >
                {changePassword.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wider">
              Danger Zone
            </h2>
            <p className="text-sm text-gray-500">
              Deleting a user removes them permanently. This action cannot be
              undone.
            </p>
            <div className="flex justify-end">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </div>
            {isSelf && (
              <p className="text-xs text-gray-500">
                You cannot delete your own account.
              </p>
            )}
          </div>

          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
