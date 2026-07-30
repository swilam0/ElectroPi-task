"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { getUser } from "@/lib/auth";
import { useMemo } from "react";
import { Menu, FolderKanban, Users } from "lucide-react";

const baseNavItems = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const currentUser = useMemo(() => getUser(), []);
  const navItems = useMemo(
    () =>
      currentUser?.role === "ADMIN"
        ? [...baseNavItems, { href: "/admin/users", label: "Users", icon: Users }]
        : baseNavItems,
    [currentUser?.role]
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300",
          sidebarOpen
            ? "fixed inset-y-0 left-0 z-50 w-60 md:static md:z-auto"
            : "hidden md:flex md:w-16"
        )}
      >
      <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-4">
        <button
          onClick={toggleSidebar}
          className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span
          className={cn(
            "truncate font-bold text-blue-600 transition-opacity duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
        >
          ElectroPi
        </span>
      </div>
      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 border-l-2 px-3 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-transparent text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600" : "text-gray-400")} />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  sidebarOpen ? "opacity-100" : "opacity-0"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
    </>);
}
