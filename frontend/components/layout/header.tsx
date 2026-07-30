"use client";

import Link from "next/link";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu } from "lucide-react";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 items-center justify-end border-b border-gray-200 bg-white px-6 shadow-sm">
      <button
        onClick={toggleSidebar}
        className="mr-auto rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-4">
        <Link href="/profile">
          <Button variant="secondary" size="sm">
            <User className="mr-2 h-4 w-4" />Profile
          </Button>
        </Link>
        <Link href="/logout">
          <Button variant="danger" size="sm">
            <LogOut className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
