"use client";

import Link from "next/link";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-4">
        <Link href="/profile">
          <Button variant="ghost" size="sm">Profile</Button>
        </Link>
        <Link href="/logout">
          <Button variant="ghost" size="sm">Logout</Button>
        </Link>
      </div>
    </header>
  );
}
