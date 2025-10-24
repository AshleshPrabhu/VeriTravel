import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { SignupForm } from "@/components/signup-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole, type UserRole } from "@/context/role-context";

const roleLabels: Record<UserRole, string> = {
  user: "Traveler account",
  hotel: "Hotel partner account",
};

export default function SignupPage() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const destination = role === "hotel" ? "/hotel-ops" : "/dashboard";
      navigate(destination, { replace: true });
    },
    [navigate, role]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDE7D6] px-4 py-12">
      <div className="w-full max-w-3xl rounded-[36px] border border-black/12 bg-white/80 p-10 shadow-[0_18px_34px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mb-8 space-y-3 text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Welcome to
          </span>
          <h1 className="font-vogue text-4xl font-bold tracking-tight text-neutral-900">
            Trip<span className="text-gray-800">DAO</span>
          </h1>
          <p className="text-sm text-neutral-600">
            Create your account to access personalized bookings and hotel operations.
          </p>
          <div className="mx-auto flex max-w-xs items-center justify-center">
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger className="h-12 rounded-full border border-black/12 bg-white px-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                <SelectValue placeholder="Choose account type" />
              </SelectTrigger>
              <SelectContent align="center" className="rounded-2xl border border-black/10 bg-white">
                <SelectItem value="user" className="uppercase tracking-[0.16em]">
                  Traveler account
                </SelectItem>
                <SelectItem value="hotel" className="uppercase tracking-[0.16em]">
                  Hotel partner
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
            {roleLabels[role]}
          </p>
        </div>

  <SignupForm onSubmit={handleSubmit} includeHotelDetails={role === "hotel"} />
      </div>
    </div>
  );
}
