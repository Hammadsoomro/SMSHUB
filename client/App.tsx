import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import Conversations from "./pages/admin/Conversations";
import Credentials from "./pages/admin/Credentials";
import Numbers from "./pages/admin/Numbers";
import BuyNumbers from "./pages/admin/BuyNumbers";
import Wallet from "./pages/admin/Wallet";
import TeamManagement from "./pages/admin/TeamManagement";
import AccountInfo from "./pages/admin/AccountInfo";
import Insights from "./pages/admin/Insights";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Team Member Routes */}
          <Route path="/messages" element={<Messages />} />
          <Route path="/conversations" element={<Conversations />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/conversations" element={<Conversations />} />
          <Route path="/admin/credentials" element={<Credentials />} />
          <Route path="/admin/numbers" element={<Numbers />} />
          <Route path="/admin/buy-numbers" element={<BuyNumbers />} />
          <Route path="/admin/wallet" element={<Wallet />} />
          <Route path="/admin/team" element={<TeamManagement />} />
          <Route path="/admin/account" element={<AccountInfo />} />
          <Route path="/admin/insights" element={<Insights />} />

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
