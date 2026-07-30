"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { getUser } from "@/lib/auth";
import { useMemo } from "react";

const baseNavItems = [
  { href: "/projects", label: "Projects" },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const currentUser = useMemo(() => getUser(), []);
  const navItems = useMemo(
    () =>
      currentUser?.role === "ADMIN"
        ? [...baseNavItems, { href: "/admin/users", label: "Users" }]
        : baseNavItems,
    [currentUser?.role]
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-200 bg-white transition-all",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <span className={cn("font-bold text-blue-600", !sidebarOpen && "hidden")}>
          ElectroPi
        </span>
        <span className={cn("font-bold text-blue-600", sidebarOpen && "hidden")}>
          EP
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
