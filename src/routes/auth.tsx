import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [name, setName] = useState("");
  const [upEmail, setUpEmail] = useState("");
  const [upPassword, setUpPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password: signInPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: upEmail,
      password: upPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email if confirmation is required.");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-display font-bold text-xl mb-8">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          PrepArena
        </Link>
        <div className="rounded-xl border border-border bg-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div><Label htmlFor="si-email">Email</Label><Input id="si-email" type="email" required value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} /></div>
                <div><Label htmlFor="si-pw">Password</Label><Input id="si-pw" type="password" required value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div><Label htmlFor="su-name">Name</Label><Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label htmlFor="su-email">Email</Label><Input id="su-email" type="email" required value={upEmail} onChange={(e) => setUpEmail(e.target.value)} /></div>
                <div><Label htmlFor="su-pw">Password</Label><Input id="su-pw" type="password" required minLength={6} value={upPassword} onChange={(e) => setUpPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>{busy ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
