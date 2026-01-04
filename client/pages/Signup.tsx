import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { MessageSquare, Loader2, AlertCircle, Sun, Moon } from "lucide-react";
import { SignupRequest } from "@shared/api";

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Signup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark";
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const password = watch("password");

  // Apply theme to document root on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const onSubmit = async (data: SignupFormData) => {
    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const payload: SignupRequest = {
        email: data.email,
        password: data.password,
        name: data.name,
      };

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Signup failed");
      }

      const result = await response.json();
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-background via-background to-background flex items-center justify-center px-4 py-12 ${isDarkMode ? "dark" : ""}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        title="Toggle theme"
        className="absolute top-4 right-4"
      >
        {isDarkMode ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </Button>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Connectlify
          </span>
        </Link>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
          <p className="text-muted-foreground mb-6">
            Sign up as an admin and start managing your SMS business
          </p>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Full Name
              </label>
              <Input
                {...register("name", { required: "Name is required" })}
                placeholder="John Doe"
                className="h-10"
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                placeholder="you@example.com"
                className="h-10"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <Input
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
                type="password"
                placeholder="••••••••"
                className="h-10"
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Confirm Password
              </label>
              <Input
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                })}
                type="password"
                placeholder="••••••••"
                className="h-10"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-gradient-to-r from-primary to-secondary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
