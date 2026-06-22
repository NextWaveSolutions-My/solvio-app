"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useState, Suspense } from "react";
import type { LoginFormData } from "@/types";
import type { SessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { loginSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Demo account credentials
const DEMO_ACCOUNTS = [
  {
    role: "Admin",
    email: "admin@demo.com",
    password: "admin123",
  },
  {
    role: "Support Agent",
    email: "support@demo.com",
    password: "support123",
  },
  {
    role: "Customer",
    email: "customer@demo.com",
    password: "customer123",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickLoginEmail, setQuickLoginEmail] = useState<string | null>(null);

  // Get redirect URL from query params
  const redirectUrl = searchParams.get("redirect");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const quickLogin = async (email: string, password: string) => {
    setQuickLoginEmail(email);
    setError("");
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setQuickLoginEmail(null);
        return;
      }
      const session = await authClient.getSession();
      let destination = redirectUrl || "/dashboard";
      if (!redirectUrl && session?.data?.user) {
        const userRole = (session.data.user as SessionUser).role;
        if (userRole === "admin") destination = "/admin";
        else if (userRole === "support") destination = "/support-agent";
      }
      router.push(destination);
      router.refresh();
    } catch (_err) {
      setError("An unexpected error occurred. Please try again.");
      setQuickLoginEmail(null);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Fetch the session to get user role
      const session = await authClient.getSession();

      // Redirect based on user role
      let destination = redirectUrl || "/dashboard";

      // If no redirect URL is specified, check user role
      if (!redirectUrl && session?.data?.user) {
        const userRole = (session.data.user as SessionUser).role;
        if (userRole === "admin") {
          destination = "/admin";
        } else if (userRole === "support") {
          destination = "/support-agent";
        }
      }

      router.push(destination);
      router.refresh();
    } catch (_err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full py-8 mx-auto max-w-md">
      <div className="flex flex-col gap-4 justify-center">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-center">
              Enter your email and password to access your support tickets
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pb-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <div className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href={
                    redirectUrl
                      ? `/register?redirect=${encodeURIComponent(redirectUrl)}`
                      : "/register"
                  }
                  className="font-medium text-info hover:text-info/90"
                >
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Account Credentials */}
        <Card className="border-primary/20 shadow-sm gap-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
              Try a demo account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-primary">
                    {account.role}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-foreground/60 truncate">
                      {account.email}
                    </span>
                    <span className="text-foreground/30 text-xs">·</span>
                    <span className="text-xs text-foreground/50 font-mono shrink-0">
                      {account.password}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="shrink-0 h-8 text-xs px-3 min-w-22.5"
                  disabled={quickLoginEmail !== null}
                  onClick={() => quickLogin(account.email, account.password)}
                >
                  {quickLoginEmail === account.email ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Signing in…
                    </>
                  ) : (
                    "Quick Login"
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full max-w-md">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
