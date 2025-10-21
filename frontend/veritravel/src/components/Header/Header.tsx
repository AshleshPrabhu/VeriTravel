"use client";

import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-center p-4">
      <div className="w-[90%] max-w-6xl flex items-center justify-between bg-[#E7E3D5] rounded-full px-6 py-3 shadow-md border border-black/10 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold tracking-tight font-vogue">
            Trip<span className="text-gray-800">DAO</span>
          </span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex space-x-12 text-lg font-semibold font-vogue text-black">
          <a href="#" className="hover:text-gray-700 transition">
            HOME
          </a>
          <a href="#" className="hover:text-gray-700 transition">
            SLOFY
          </a>
          <a href="#" className="hover:text-gray-700 transition">
            CONTACT&nbsp;US
          </a>
        </nav>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="flex items-center bg-white rounded-full border border-gray-300 px-2">
            <Input
              type="text"
              placeholder="Search"
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm w-24 md:w-32 font-sans"
            />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gray-100"
            >
              <Search className="w-4 h-4 text-black" />
            </Button>
          </div>

          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-black/5"
          >
            <Bell className="w-5 h-5 text-black" />
          </Button>

          {/* Profile Circle */}
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-full border-gray-400 bg-white hover:bg-gray-50"
          />
        </div>
      </div>
    </header>
  );
}
