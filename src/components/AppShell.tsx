import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, BookOpen, Shield, LogOut } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            PrepArena
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-secondary flex items-center gap-1.5" activeProps={{ className: "bg-secondary" }}>
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link to="/topics" className="px-3 py-1.5 rounded-md hover:bg-secondary flex items-center gap-1.5" activeProps={{ className: "bg-secondary" }}>
              <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Topics</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className="px-3 py-1.5 rounded-md hover:bg-secondary flex items-center gap-1.5 text-primary" activeProps={{ className: "bg-secondary" }}>
                <Shield className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            {user && (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="ml-2">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
