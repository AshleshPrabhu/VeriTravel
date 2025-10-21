"use client";

import Header from "@/components/Header/Header";
import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";

export default function ChatView() {
  return (
    <div className="h-screen bg-[#E7E3D5] text-black flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 pt-24 gap-4 px-4 md:px-8 min-h-0">
        <ChatSidebar />
        <div className="flex-1 min-h-0 rounded-[2rem] border border-gray-400/30 shadow-inner overflow-hidden">
          <ChatArea />
        </div>
      </div>
    </div>
  );
}
