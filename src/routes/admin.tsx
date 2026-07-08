import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { BookOpen, Timer } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", replace: true });
    else if (!isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !isAdmin) return null;

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          className="px-4 py-2 text-sm flex items-center gap-1.5 border-b-2 border-transparent hover:text-primary"
          activeProps={{ className: "border-primary text-primary" }}
        >
          <BookOpen className="h-4 w-4" /> Question Bank
        </Link>
        <Link
          to="/admin/mocks"
          className="px-4 py-2 text-sm flex items-center gap-1.5 border-b-2 border-transparent hover:text-primary"
          activeProps={{ className: "border-primary text-primary" }}
        >
          <Timer className="h-4 w-4" /> Mock Tests
        </Link>
      </div>
      <Outlet />
    </AppShell>
  );
}
