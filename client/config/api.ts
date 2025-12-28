// API Configuration
// Uses VITE_API_URL environment variable, defaults to same origin
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || window.location.origin;

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    signup: "/api/auth/signup",
    profile: "/api/auth/profile",
  },
  admin: {
    numbers: "/api/admin/numbers",
    credentials: "/api/admin/credentials",
    addExistingNumber: "/api/admin/add-existing-number",
    assignNumber: "/api/admin/assign-number",
    purchaseNumber: "/api/admin/purchase-number",
    team: "/api/admin/team",
    teamInvite: "/api/admin/team/invite",
    dashboard: "/api/admin/dashboard/stats",
  },
  messages: {
    assignedPhoneNumber: "/api/messages/assigned-phone-number",
    contacts: "/api/messages/contacts",
    conversation: "/api/messages/conversation",
    send: "/api/messages/send",
    markRead: "/api/messages/mark-read",
  },
  contacts: "/api/contacts",
  wallet: "/api/wallet",
  walletTransactions: "/api/wallet/transactions",
};
