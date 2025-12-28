import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet as WalletIcon,
  Loader2,
  CreditCard,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Plus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Wallet as WalletType, WalletTransaction } from "@shared/api";
import ApiService from "@/services/api";
import { toast } from "sonner";

export default function Wallet() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [twilioBalance, setTwilioBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTwilio, setIsRefreshingTwilio] = useState(false);
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
              View Twilio credits and purchase phone numbers
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
        <div className="grid md:grid-cols-1 gap-6">
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
                    twilioError ? "bg-orange-500/20" : "bg-emerald-500/20"
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


        {/* Transaction History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Transaction History
            </h2>
            {transactions.length > 0 && (
              <Badge variant="secondary">
                {transactions.length}{" "}
                {transactions.length === 1 ? "transaction" : "transactions"}
              </Badge>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <WalletIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">
                No transactions yet
              </p>
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
                        {new Date(transaction.createdAt).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(transaction.createdAt).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
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
