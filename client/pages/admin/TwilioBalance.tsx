import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface BalanceResponse {
  balance: number;
}

export default function TwilioBalance() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch balance on component mount
  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch("/api/admin/twilio-balance", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Please connect your Twilio credentials first in Settings.",
        );
      }

      if (response.status === 500) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Twilio API error. Please check your credentials and try again.",
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Twilio balance (${response.status})`);
      }

      const data: BalanceResponse = await response.json();

      // Validate balance is a number
      if (typeof data.balance !== "number" || isNaN(data.balance)) {
        throw new Error("Invalid balance data received from server");
      }

      setBalance(data.balance);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching balance",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchBalance(true);
  };

  const formatBalance = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const getBalanceColor = (value: number) => {
    if (value > 100) return "text-green-600";
    if (value > 10) return "text-yellow-600";
    return "text-destructive";
  };

  const getBalanceBgColor = (value: number) => {
    if (value > 100) return "bg-green-50 border-green-200";
    if (value > 10) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-medium">Loading Twilio Balance</p>
              <p className="text-sm text-muted-foreground">
                Fetching your account balance...
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Twilio Balance</h1>
        <p className="text-muted-foreground mb-8">
          Monitor your Twilio account balance and usage
        </p>

        {/* Error Message */}
        {error && (
          <Card className="p-6 bg-red-50 border-2 border-red-300 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  ❌ Unable to fetch balance
                </h3>
                <p className="text-sm text-red-800 mb-4">{error}</p>
                {error.includes("connect your Twilio credentials") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/admin/settings")}
                    className="border-red-300 text-red-600 hover:bg-red-100"
                  >
                    Go to Settings
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Balance Card */}
        {balance !== null && !error && (
          <Card className={`p-8 border-2 mb-8 ${getBalanceBgColor(balance)}`}>
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-background rounded-lg">
                    <DollarSign
                      className={`w-8 h-8 ${getBalanceColor(balance)}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Account Balance
                    </p>
                    <h2
                      className={`text-4xl font-bold mt-1 ${getBalanceColor(balance)}`}
                    >
                      {formatBalance(balance)}
                    </h2>
                  </div>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>

              {/* Last Updated */}
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}

              {/* Balance Status Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    {balance > 10 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-sm text-green-700">
                          Healthy
                        </span>
                      </>
                    ) : balance > 0 ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-sm text-yellow-700">
                          Low Balance
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span className="font-medium text-sm text-destructive">
                          No Credit
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Currency
                  </p>
                  <p className="font-semibold text-sm">USD ($)</p>
                </div>

                <div className="p-4 rounded-lg bg-background/50 border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-2">
                    Auto-Recharge
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Manage in Twilio Console
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Usage Tips */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex gap-4">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Usage Tips</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Monitor your balance regularly</li>
                  <li>✓ Enable auto-recharge to avoid service interruptions</li>
                  <li>✓ Review your SMS usage patterns</li>
                  <li>✓ Contact Twilio support for bulk discounts</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Add Credits */}
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex gap-4">
              <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-3">
                  Add Credits
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  Visit your Twilio console to add credits or set up automatic
                  recharge.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open("https://www.twilio.com/console", "_blank")
                  }
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Open Twilio Console
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-sm mb-2">
                Why is my balance negative?
              </p>
              <p className="text-sm text-muted-foreground">
                Your balance is the amount of credit available in your Twilio
                account. As you send SMS messages, the cost is deducted from
                your balance.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2">
                How do I add more credits?
              </p>
              <p className="text-sm text-muted-foreground">
                You can add credits through your Twilio console. Go to Billing
                &gt; Billing History and add a payment method or set up
                auto-recharge.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2">
                Will my service stop if balance is zero?
              </p>
              <p className="text-sm text-muted-foreground">
                Yes, you won't be able to send SMS messages when your balance
                reaches zero. We recommend setting up auto-recharge to maintain
                continuous service.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2">
                How often is the balance updated?
              </p>
              <p className="text-sm text-muted-foreground">
                The balance shown here is fetched in real-time from your Twilio
                account. Click Refresh to get the latest balance.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
