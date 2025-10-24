"use client";

import { Link, useLocation } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole, type UserRole } from "@/context/role-context";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
};

const navItemsByRole: Record<UserRole, NavItem[]> = {
  user: [
    { label: "DASHBOARD", to: "/dashboard" },
    { label: "SLOFY", to: "/agent" },
  ],
  hotel: [
    { label: "HOTEL OPS", to: "/hotel-ops" },
    { label: "AGENT", to: "/agent" },
  ],
};

export default function Header() {
  const location = useLocation();
  const { role } = useRole();
  const navItems = navItemsByRole[role];

  return (
    <header className="fixed left-0 top-0 z-50 flex w-full justify-center p-4">
      <div className="flex w-[90%] max-w-6xl items-center justify-between rounded-full border border-black/10 bg-[#E7E3D5] px-6 py-3 shadow-md backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="font-vogue text-2xl font-bold tracking-tight">
            Trip<span className="text-gray-800">DAO</span>
          </span>
        </div>

        <nav className="hidden items-center gap-12 font-vogue text-lg font-semibold text-black md:flex">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "transition",
                  isActive ? "text-neutral-900" : "text-black hover:text-gray-700"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center rounded-full border border-gray-300 bg-white px-2">
            <Input
              type="text"
              placeholder="Search"
              className="w-24 border-none bg-transparent font-sans text-sm focus-visible:ring-0 focus-visible:ring-offset-0 md:w-32"
            />
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
              <Search className="h-4 w-4 text-black" />
            </Button>
          </div>

          <span className="hidden rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700 shadow-sm sm:inline-block">
            {role === "hotel" ? "Hotel" : "Traveler"}
          </span>

          <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5">
            <Bell className="h-5 w-5 text-black" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-gray-400 bg-white hover:bg-gray-50"
          />
        </div>
      </div>
    </header>
  );
}
