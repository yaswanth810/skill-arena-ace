import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, Target, TrendingUp, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            PrepArena
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
                <Button asChild><Link to="/auth">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3 text-primary" /> Built for Infosys, TCS, Wipro, Accenture & more
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold font-display leading-tight tracking-tight">
          Crack your <span className="text-primary">placement</span>
          <br /> with focused practice.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Topic-wise practice, company-specific mock tests, and AI-powered explanations.
          Find your weak areas, fix them, and compete with your squad — every week.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Button asChild size="lg">
            <Link to={user ? "/dashboard" : "/auth"}>Start practicing</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/topics">Browse topics</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target, title: "Topic Practice", desc: "Aptitude, Reasoning, Verbal & Tech — with instant feedback." },
          { icon: GraduationCap, title: "Company Mocks", desc: "Real test patterns for the top service-based recruiters." },
          { icon: TrendingUp, title: "Weak-area Analytics", desc: "Know exactly what to study next, backed by data." },
          { icon: Users, title: "Squad Leaderboards", desc: "Prep with friends, compete weekly, keep the streak alive." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-5">
            <Icon className="h-5 w-5 text-primary mb-3" />
            <div className="font-semibold">{title}</div>
            <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
