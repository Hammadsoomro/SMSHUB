import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InitAdmin from "./pages/InitAdmin";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import { ContactProvider } from "./contexts/ContactContext";
import { registerServiceWorker } from "./lib/service-worker";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import Conversations from "./pages/admin/Conversations";
import Credentials from "./pages/admin/Credentials";
import BuyNumbers from "./pages/admin/BuyNumbers";
import BoughtNumbers from "./pages/admin/BoughtNumbers";
import TeamManagement from "./pages/admin/TeamManagement";
import Settings from "./pages/admin/Settings";
import AccountInfo from "./pages/admin/AccountInfo";
import Insights from "./pages/admin/Insights";
import TwilioBalance from "./pages/admin/TwilioBalance";

// Team Member Pages
import TeamMemberSettings from "./pages/TeamMemberSettings";

const queryClient = new QueryClient();

const App = () => {
  // Register service worker for PWA offline support on app startup
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ContactProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/init-admin" element={<InitAdmin />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsAndConditions />} />

                {/* Team Member Routes */}
                <Route path="/messages" element={<Messages />} />
                <Route path="/conversations" element={<Conversations />} />
                <Route path="/settings" element={<TeamMemberSettings />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route
                  path="/admin/conversations"
                  element={<Conversations />}
                />
                <Route path="/admin/credentials" element={<Credentials />} />
                <Route path="/admin/buy-numbers" element={<BuyNumbers />} />
                <Route
                  path="/admin/bought-numbers"
                  element={<BoughtNumbers />}
                />
                <Route path="/admin/team" element={<TeamManagement />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/account" element={<AccountInfo />} />
                <Route path="/admin/insights" element={<Insights />} />
                <Route
                  path="/admin/twilio-balance"
                  element={<TwilioBalance />}
                />

                {/* Catch All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ContactProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
