"use client";

import { useMe } from "@/hooks/use-auth";
import { useUpdateUser, useChangePassword } from "@/hooks/use-users";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useUiStore } from "@/stores/ui-store";
import { useMemo, useState } from "react";
import { getUser } from "@/lib/auth";

export default function ProfilePage() {
  const currentUser = useMemo(() => getUser(), []);
  const { data, isLoading } = useMe();
  const updateUser = useUpdateUser();
  const changePassword = useChangePassword();
  const addToast = useUiStore((s) => s.addToast);

  const user = data?.data || currentUser;

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [formError, setFormError] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-red-600">Could not load profile.</p>;
  }

  const handleSaveProfile = async () => {
    setFormError("");
    try {
      await updateUser.mutateAsync({ id: user.id, data: { name, email } });
      addToast({ type: "success", message: "Profile updated successfully." });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to update profile.");
    }
  };

  const handleChangePassword = async () => {
    setFormError("");
    try {
      await changePassword.mutateAsync({
        id: user.id,
        data: { currentPassword: currentPw, newPassword: newPw },
      });
      addToast({ type: "success", message: "Password changed successfully." });
      setCurrentPw("");
      setNewPw("");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr.message || "Failed to change password.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Account Information
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="profile-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="profile-email"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Change Password
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="profile-current-pw"
            label="Current Password"
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <Input
            id="profile-new-pw"
            label="New Password"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Min 8 chars, 1 letter, 1 number"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={changePassword.isPending || !currentPw || !newPw}
            >
              {changePassword.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {formError && <p className="text-sm text-red-600">{formError}</p>}
    </div>
  );
}
