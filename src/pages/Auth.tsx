import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import LightRays from "@/components/LightRays";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // rays color follows global theme
  const [raysTheme, setRaysTheme] = useState<"dark" | "light">("dark");

  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Initialize theme from localStorage or current DOM and sync <html> class + rays
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light" | null) ?? null;
    const root = document.documentElement;
    const initial: "dark" | "light" = saved ?? (root.classList.contains("dark") ? "dark" : "light");

    if (initial === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    setRaysTheme(initial);
  }, []);

  // Toggle global theme (html.dark) + persist + sync rays color
  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setRaysTheme("light");
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setRaysTheme("dark");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({ title: "Account created! You can now log in." });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Mobile-friendly tuning
  const raysColor = raysTheme === "dark" ? "#00ffff" : "#ffb86b"; // cyan vs warm orange
  const rayLength = isMobile ? 0.9 : 1.2;       // shorter rays on mobile to save GPU
  const mouseInfluence = isMobile ? 0.06 : 0.1; // gentler mouse parallax on mobile

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-neutral-950">
      {/* Light rays background — Framer Motion fade-in */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <LightRays
          className="absolute inset-0"
          raysOrigin="top-center"
          raysColor={raysColor}
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={rayLength}
          followMouse={true}
          mouseInfluence={mouseInfluence}
          noiseAmount={0.08}
          distortion={0.04}
        />
      </motion.div>

      {/* Soft overlay gradient — Tailwind keyframe fade-in (from your tailwind.config.ts) */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 opacity-80 animate-fade-in-slow" />

      {/* Global theme + rays toggle */}
      <div className="absolute right-4 top-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="rounded-full border border-neutral-800/60 bg-neutral-900/40 backdrop-blur hover:bg-neutral-900/70"
        >
          {raysTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Foreground content — subtle entrance */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="bg-neutral-900/70 backdrop-blur-xl border-neutral-800 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription>
                {isLogin ? "Sign in to manage your budget" : "Start tracking your expenses today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
