import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import ChatView from "./components/ChatView";
import Header from "./components/Header/Header";
import HotelDashboard from "./components/HotelDashboard";
import UserDashboard from "./components/UserDashboard";
import LoginPage from "./pages/login/page";
import { RoleProvider, useRole, type UserRole } from "@/context/role-context";

type AppRoute = {
  path: string;
  element: ReactElement;
  roles: UserRole[];
};

const appRoutes: AppRoute[] = [
  { path: "dashboard", element: <UserDashboard />, roles: ["user"] },
  { path: "hotel-ops", element: <HotelDashboard />, roles: ["hotel"] },
  { path: "agent", element: <ChatView />, roles: ["user", "hotel"] },
];

function RoleAwareRedirect() {
  const { role } = useRole();
  const target = role === "hotel" ? "/hotel-ops" : "/dashboard";
  return <Navigate to={target} replace />;
}

function RoleRoute({ element, roles }: { element: ReactElement; roles: UserRole[] }) {
  const { role } = useRole();
  if (!roles.includes(role)) {
    return <RoleAwareRedirect />;
  }
  return element;
}

function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        {appRoutes.map(({ path, element, roles }) => (
          <Route key={path} path={path} element={<RoleRoute element={element} roles={roles} />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </RoleProvider>
  );
}
