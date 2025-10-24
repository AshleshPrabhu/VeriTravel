"use client";

import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";

export default function ChatView() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#E7E3D5] text-black">
      <div className="flex min-h-0 flex-1 gap-4 px-4 pt-24 md:px-8">
        <ChatSidebar />
        <div className="min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-gray-400/30 shadow-inner">
          <ChatArea />
        </div>
      </div>
    </div>
  );
}
