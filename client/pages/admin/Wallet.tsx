import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Wallet as WalletIcon,
  Loader2,
  TrendingDown,
  TrendingUp,
  Plus,
  RefreshCw,
  Link as LinkIcon,
  DollarSign,
} from "lucide-react";
import { Wallet as WalletType, WalletTransaction } from "@shared/api";

interface TwilioBalance {
  balance: number;
}

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [twilioBalance, setTwilioBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [addAmount, setAddAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [twilioConnected, setTwilioConnected] = useState(false);

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
      const token = localStorage.getItem("token");
      const response = await fetch("/api/wallet/twilio-balance", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.balance !== undefined) {
          setTwilioBalance(data.balance);
          setTwilioConnected(true);
        }
      } else {
        setTwilioConnected(false);
      }
    } catch {
      setTwilioConnected(false);
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      await fetchTwilioBalance();
      setSuccess("✅ Twilio balance refreshed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to refresh balance");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsRefreshing(false);
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const totalSpent = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalAdded = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Wallet & Billing</h1>
            <p className="text-muted-foreground">
              Monitor your account balance and Twilio usage
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/buy-numbers")}
          >
            Buy Numbers
          </Button>
        </div>

        {error && (
          <Card className="p-6 bg-red-50 border-red-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {success && (
          <Card className="p-6 bg-green-50 border-green-200 mb-8 flex items-center gap-4">
            <p className="text-sm text-green-700">{success}</p>
          </Card>
        )}

        {/* Twilio Balance Card */}
        {twilioConnected && twilioBalance !== null ? (
          <Card className="p-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white mb-8 border-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-5 h-5" />
                  <p className="text-sm font-medium text-blue-100">
                    Twilio Account Balance
                  </p>
                </div>
                <p className="text-5xl font-bold">${twilioBalance.toFixed(2)}</p>
                <p className="text-sm text-blue-100 mt-2">
                  Connected account with live balance
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                  size="sm"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => navigate("/admin/settings?tab=credentials")}
                  variant="ghost"
                  className="text-white hover:bg-blue-700"
                  size="sm"
                >
                  Settings
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-yellow-50 border-yellow-200 mb-8">
            <div className="flex gap-4 items-center justify-between">
              <div className="flex gap-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    Twilio Credentials Not Connected
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Connect your Twilio credentials in Settings to see your
                    account balance and usage.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/admin/settings")}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Connect Twilio
              </Button>
            </div>
          </Card>
        )}

        {/* Local Wallet Balance Card */}
        {wallet && (
          <Card className="p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 mb-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Local Wallet Balance
                </p>
                <p className="text-5xl font-bold">
                  ${wallet.balance.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  For internal use and credits
                </p>
              </div>
              <div className="p-4 bg-primary/20 rounded-lg">
                <WalletIcon className="w-12 h-12 text-primary" />
              </div>
            </div>
          </Card>
        )}

        {/* Add Funds and Statistics Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Add Funds Form */}
          <Card className="p-6 md:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Add Funds</h2>

            <form onSubmit={handleAddFunds} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Amount</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="pl-7 h-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: $1.00
                </p>
              </div>

              <Button
                type="submit"
                disabled={isAdding}
                className="w-full bg-gradient-to-r from-primary to-secondary"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
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
                    className="text-xs"
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
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold">${totalSpent.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>

            {/* Total Added */}
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Added
                  </p>
                  <p className="text-3xl font-bold">
                    ${totalAdded.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Transaction History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Transaction History</h2>
            <div className="text-xs text-muted-foreground">
              {transactions.length} transactions
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-30" />
              <p className="text-muted-foreground mb-2">No transactions yet</p>
              <p className="text-xs text-muted-foreground">
                Add funds or purchase numbers to see transactions
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id || `transaction-${index}`}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        transaction.type === "credit"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      {transaction.type === "credit" ? (
                        <TrendingUp
                          className={`w-5 h-5 ${
                            transaction.type === "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-right font-semibold flex-shrink-0 ml-4 ${
                      transaction.type === "credit"
                        ? "text-green-600"
                        : "text-red-600"
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

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200 mt-8">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Understanding Your Balance
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  <strong>Twilio Balance:</strong> Live balance from your Twilio
                  account (requires connected credentials)
                </li>
                <li>
                  <strong>Local Wallet:</strong> Internal balance for tracking
                  and credits within this platform
                </li>
                <li>
                  <strong>Transactions:</strong> History of all fund additions
                  and purchases
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
