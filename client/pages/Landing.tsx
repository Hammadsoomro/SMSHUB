import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Lock,
  Users,
  Zap,
  Phone,
  BarChart3,
  Shield,
  Smartphone,
  Sun,
  Moon,
} from "lucide-react";

export default function Landing() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark";
  });

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

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-background via-background to-background ${isDarkMode ? "dark" : ""}`}
    >
      {/* Schema.org structured data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Connectlify",
          description:
            "Professional SMS messaging platform for teams. Send bulk SMS, manage phone numbers, and automate communication.",
          url: "https://connectlify.io",
          applicationCategory: "BusinessApplication",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "500",
          },
        })}
      </script>

      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Connectlify
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-primary to-secondary">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:py-32 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              Manage Your SMS Business{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Effortlessly
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A complete SMS management platform for teams. Buy Twilio numbers,
              manage team members, send and receive messages in real-time, and
              track messaging insights all from one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  Start Free
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground text-lg">
              Powerful features designed for SMS businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Phone,
                title: "Twilio Integration",
                description:
                  "Seamlessly connect your Twilio account and manage numbers",
              },
              {
                icon: Users,
                title: "Team Management",
                description:
                  "Create and manage your team members with role-based access",
              },
              {
                icon: Smartphone,
                title: "Real-Time Messaging",
                description:
                  "Send and receive SMS messages instantly with socket.io",
              },
              {
                icon: BarChart3,
                title: "Insights & Analytics",
                description:
                  "Track messaging activity and team performance metrics",
              },
              {
                icon: Zap,
                title: "Number Assignment",
                description: "Assign and manage phone numbers for team members",
              },
              {
                icon: Lock,
                title: "Secure & Private",
                description:
                  "Enterprise-grade security with isolated team data",
              },
              {
                icon: MessageSquare,
                title: "Chat History",
                description:
                  "Complete message history and conversation management",
              },
              {
                icon: Shield,
                title: "Role-Based Access",
                description:
                  "Admin and team member roles with granular permissions",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg border border-border bg-background hover:shadow-lg hover:border-primary/50 smooth-transition group"
              >
                <feature.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 smooth-transition" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            Simple Setup Process
          </h2>
          <div className="space-y-8">
            {[
              {
                step: 1,
                title: "Create Account",
                description:
                  "Sign up as an admin and get instant access to your dashboard",
              },
              {
                step: 2,
                title: "Connect Twilio",
                description:
                  "Add your Twilio Account SID and Auth Token securely",
              },
              {
                step: 3,
                title: "Buy Numbers",
                description:
                  "Purchase phone numbers through your Twilio account",
              },
              {
                step: 4,
                title: "Manage Team",
                description:
                  "Invite team members and assign them phone numbers",
              },
              {
                step: 5,
                title: "Start Messaging",
                description:
                  "Team members can now send and receive SMS messages",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary">
                    <span className="text-white font-bold">{item.step}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your SMS Business?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join teams using Connectlify to manage their Twilio operations
            efficiently
          </p>
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 bg-background/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-muted-foreground">
          <p>&copy; 2024 Connectlify. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground smooth-transition">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground smooth-transition">
              Terms
            </a>
            <a href="#" className="hover:text-foreground smooth-transition">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
