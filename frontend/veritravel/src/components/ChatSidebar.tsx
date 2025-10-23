import { Pencil } from "lucide-react";

export default function ChatSidebar() {
  return (
    <div className="hidden md:flex h-full min-h-0 w-1/4 bg-[#FDFCF5]/55 border-black border-1 rounded-[2rem] flex-col justify-between p-6">
      {/* Top Section */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center mb-6 space-x-2">
          <Pencil className="w-4 h-4 text-black" />
          <span className="uppercase text-black font-semibold text-sm tracking-wider">
            New Chat
          </span>
        </div>

        <h3 className="text-lg font-semibold mb-2 text-black">Recent Chats</h3>
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <p
                key={i}
                className="text-sm text-gray-700/90 truncate border-b border-gray-400/20 pb-2"
              >
                Hey I am looking for a 2 day trip to Himachal Pradesh...
              </p>
            ))}
        </div>
      </div>

      {/* Sloth Mascot */}
  <div className="relative mt-8 flex justify-center items-center">
        <img
          src="/assets/image/AI_Page.png"
          alt="AI Sloth Assistant"
          className="
      object-contain 
      w-[250px]
      h-auto 
      mx-auto 
      drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]
      transition-transform duration-500
      -ml-14
    "
        />

        {/* Speech Bubble */}
        <div
          className="
      absolute 
      -top-0 left-[35%] 
      bg-white border border-black/30 
      px-5 py-2 rounded-full 
      text-sm font-semibold text-black 
      shadow-md
      whitespace-nowrap
    "
        >
          I knew u needed my help
        </div>
      </div>

    </div>
  );
}
