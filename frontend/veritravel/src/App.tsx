import { useState } from "react";

import ChatView from "./components/ChatView";
import HotelDashboard from "./components/HotelDashboard";
import UserDashboard from "./components/UserDashboard";
import type { HeaderView } from "@/components/Header/Header";

function App() {
  const [activeView, setActiveView] = useState<HeaderView>("user");

  const handleNavigate = (view: HeaderView) => {
    setActiveView(view);
  };

  switch (activeView) {
    case "user":
      return <UserDashboard activeView={activeView} onNavigate={handleNavigate} />;
    case "chat":
      return <ChatView activeView={activeView} onNavigate={handleNavigate} />;
    case "hotel":
    default:
      return <HotelDashboard activeView={activeView} onNavigate={handleNavigate} />;
  }
}

export default App;
