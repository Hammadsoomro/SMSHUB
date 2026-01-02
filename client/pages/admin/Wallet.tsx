import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Link as LinkIcon,
  DollarSign,
} from "lucide-react";
import { WalletTransaction } from "@shared/api";

export default function Wallet() {
  const navigate = useNavigate();
  const [twilioBalance, setTwilioBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
        await Promise.all([fetchTransactions(), fetchTwilioBalance()]);
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
    } catch {
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setIsRefreshing(false);
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

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Wallet & Billing</h1>
            <p className="text-muted-foreground">
              Monitor your Twilio account balance and transaction history
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/buy-numbers")}
          >
            Buy Numbers
          </Button>
        </div>

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
                  Live balance from your connected Twilio account
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
                  onClick={() => navigate("/admin/settings")}
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
                Purchase numbers or perform other actions to see transactions
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
                        <TrendingUp className="w-5 h-5 text-green-600" />
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
                About Your Wallet
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  <strong>Twilio Balance:</strong> Live account balance from your
                  connected Twilio account
                </li>
                <li>
                  <strong>Transactions:</strong> History of all Twilio charges and
                  activities
                </li>
                <li>
                  <strong>Refresh:</strong> Click refresh to get the latest balance
                  from Twilio
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
