import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Settings,
  Users,
  Phone,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Wallet,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const ADMIN_MENU = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/admin/insights", label: "Messaging Insights", icon: BarChart3 },
  { href: "/admin/bought-numbers", label: "Bought Numbers", icon: Phone },
  { href: "/admin/buy-numbers", label: "Buy Numbers", icon: Phone },
  { href: "/admin/twilio-balance", label: "Twilio Balance", icon: Wallet },
  { href: "/admin/team", label: "Team Management", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark";
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Apply theme to document root on mount and when isDarkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className={`flex h-screen bg-background ${isDarkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 border-r border-sidebar-border/50 overflow-hidden transition-all duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:w-20 lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border/30">
            <Link to="/" className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div
                className={`overflow-hidden ${!sidebarOpen ? "lg:hidden" : ""}`}
              >
                <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                  Connectlify
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 hover:bg-sidebar-accent/50 rounded-lg transition-colors"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <X className="w-4 h-4 text-sidebar-foreground" />
              ) : (
                <Menu className="w-4 h-4 text-sidebar-foreground" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {ADMIN_MENU.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      active
                        ? "text-white"
                        : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                    }`}
                  />
                  <span
                    className={`font-medium text-sm ${!sidebarOpen ? "lg:hidden" : ""}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border/30 p-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={!sidebarOpen ? "lg:hidden" : ""}>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm h-16 flex items-center justify-between px-6 shadow-sm">
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                Admin Dashboard
              </p>
              <p className="text-xs text-muted-foreground">
                Manage your SMS business
              </p>
            </div>
          </div>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
