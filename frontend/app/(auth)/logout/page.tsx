"use client";

import { useLogout } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export default function LogoutPage() {
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    logout.mutateAsync().finally(() => {
      router.push("/login");
    });
  }, []);

  return (
    <div className="flex items-center justify-center py-12">
      <Spinner />
    </div>
  );
}
