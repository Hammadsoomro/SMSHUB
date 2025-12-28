import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Wallet as WalletIcon,
  Loader2,
  TrendingDown,
  TrendingUp,
  Plus,
  CreditCard,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Wallet as WalletType, WalletTransaction } from "@shared/api";
import ApiService from "@/services/api";
import { toast } from "sonner";

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [twilioBalance, setTwilioBalance] = useState<number | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshingTwilio, setIsRefreshingTwilio] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [twilioError, setTwilioError] = useState<string | null>(null);

  useEffect(() => {
    const validateAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }
        await Promise.all([
          fetchWallet(),
          fetchTransactions(),
          fetchTwilioBalance(),
        ]);
        setIsLoading(false);
      } catch {
        navigate("/login", { replace: true });
      }
    };

    validateAuth();
  }, [navigate]);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet);
      }
    } catch {
      // Wallet fetch error handled silently
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/wallet/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      // Transaction fetch error handled silently
    }
  };

  const fetchTwilioBalance = async () => {
    try {
      const result = await ApiService.getTwilioBalance();
      if (result.error) {
        setTwilioError(result.error);
        setTwilioBalance(null);
      } else {
        setTwilioBalance(result.balance);
        setTwilioError(null);
      }
    } catch {
      setTwilioError("Failed to fetch Twilio balance");
      setTwilioBalance(null);
    }
  };

  const handleRefreshTwilioBalance = async () => {
    setIsRefreshingTwilio(true);
    try {
      await fetchTwilioBalance();
      toast.success("Twilio balance refreshed");
    } catch {
      toast.error("Failed to refresh Twilio balance");
    } finally {
      setIsRefreshingTwilio(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsAdding(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/wallet/add-funds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add funds");
      }

      const data = await response.json();
      setWallet(data.wallet);
      setAddAmount("");
      setSuccess("✅ Funds added successfully!");

      await fetchTransactions();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading wallet...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Wallet & Billing</h1>
            <p className="text-muted-foreground">
              Manage your account balance, view Twilio credits, and purchase phone
              numbers
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/buy-numbers")}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buy Phone Numbers
          </Button>
        </div>

        {/* Balance Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Account Wallet Balance */}
          {wallet && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50 border-blue-200 dark:border-blue-800 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                      Account Balance
                    </p>
                    <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                      ${wallet.balance.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      {wallet.currency}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <WalletIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Available for SMS purchases and services
                </p>
              </div>
            </Card>
          )}

          {/* Twilio Balance */}
          <Card
            className={`p-6 bg-gradient-to-br overflow-hidden relative ${
              twilioError
                ? "from-orange-50 to-orange-100/50 dark:from-orange-950 dark:to-orange-900/50 border-orange-200 dark:border-orange-800"
                : "from-emerald-50 to-emerald-100/50 dark:from-emerald-950 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-800"
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/20 to-emerald-300/20 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p
                      className={`text-sm font-semibold ${
                        twilioError
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      Twilio Credits
                    </p>
                    {!twilioError && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  {twilioError ? (
                    <div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 font-semibold">
                        Not Connected
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {twilioError}
                      </p>
                    </div>
                  ) : twilioBalance !== null ? (
                    <>
                      <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">
                        ${twilioBalance.toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                        USD
                      </p>
                    </>
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    twilioError
                      ? "bg-orange-500/20"
                      : "bg-emerald-500/20"
                  }`}
                >
                  <CreditCard
                    className={`w-8 h-8 ${
                      twilioError
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  />
                </div>
              </div>
              {!twilioError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshTwilioBalance}
                  disabled={isRefreshingTwilio}
                  className="text-xs h-8"
                >
                  <RefreshCw
                    className={`w-3 h-3 mr-1 ${
                      isRefreshingTwilio ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Add Funds Section & Statistics */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Add Funds Form */}
          <Card className="p-6 md:col-span-1 h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Funds
            </h2>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mb-4 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mb-4 flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  {success}
                </p>
              </div>
            )}

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="pl-7 h-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Minimum: $1.00 • Maximum: $10,000.00
                </p>
              </div>

              <Button
                type="submit"
                disabled={isAdding || !addAmount}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Funds
                  </>
                )}
              </Button>
            </form>

            {/* Quick Add Buttons */}
            <div className="mt-6 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Quick Add
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[10, 25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setAddAmount(amount.toString())}
                    className="text-xs hover:bg-primary hover:text-primary-foreground"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <div className="md:col-span-2 space-y-4">
            {/* Total Spent */}
            <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950 dark:to-red-900/50 border-red-200 dark:border-red-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                    $
                    {transactions
                      .filter((t) => t.type === "debit")
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    {transactions.filter((t) => t.type === "debit").length} transactions
                  </p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            {/* Total Added */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/50 border-green-200 dark:border-green-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                    Total Added
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    $
                    {transactions
                      .filter((t) => t.type === "credit")
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {transactions.filter((t) => t.type === "credit").length} transactions
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Transaction History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Transaction History
            </h2>
            {transactions.length > 0 && (
              <Badge variant="secondary">
                {transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}
              </Badge>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <WalletIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id || `transaction-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-lg flex-shrink-0 ${
                        transaction.type === "credit"
                          ? "bg-green-100 dark:bg-green-950"
                          : "bg-red-100 dark:bg-red-950"
                      }`}
                    >
                      {transaction.type === "credit" ? (
                        <TrendingUp
                          className={`w-5 h-5 ${
                            transaction.type === "credit"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        />
                      ) : (
                        <TrendingDown
                          className={`w-5 h-5 ${
                            transaction.type === "credit"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()} at{" "}
                        {new Date(transaction.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-right font-semibold flex-shrink-0 ${
                      transaction.type === "credit"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.type === "credit" ? "+" : "-"}$
                    {transaction.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
