import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MessageData {
  _id?: string;
  from?: string;
  to?: string;
  body?: string;
  status?: string;
  sentAt?: string;
  receivedAt?: string;
  adminId?: string;
}

interface InsightMetrics {
  totalMessages: number;
  sentToday: number;
  receivedToday: number;
  avgResponseTime: number;
  responseRate: number;
  activeNumbers: number;
  messagesByHour: Array<{ hour: string; count: number }>;
  messagesByStatus: Array<{ status: string; count: number }>;
  dailyMessages: Array<{ date: string; sent: number; received: number }>;
}

export default function Insights() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<InsightMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7days");
  const [error, setError] = useState("");

  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      await fetchInsights();
    };

    validateAuth();
  }, [navigate, timeRange]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(
        `/api/admin/insights?timeRange=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else if (response.status === 400) {
        // No messages yet - initialize with empty metrics
        setMetrics({
          totalMessages: 0,
          sentToday: 0,
          receivedToday: 0,
          avgResponseTime: 0,
          responseRate: 0,
          activeNumbers: 0,
          messagesByHour: [],
          messagesByStatus: [],
          dailyMessages: [],
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Server error: ${response.status}`;
        setError(errorMessage);
        console.error("Insights fetch error:", errorMessage);
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load insights data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "#10b981";
      case "sent":
        return "#3b82f6";
      case "failed":
        return "#ef4444";
      case "received":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading insights...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!metrics) {
    return (
      <AdminLayout>
        <div>
          <h1 className="text-3xl font-bold mb-8">Messaging Insights</h1>
          <Card className="p-12 text-center border-red-200 bg-red-50">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Unable to Load Insights
            </h2>
            <p className="text-red-800">{error}</p>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const isEmpty = metrics.totalMessages === 0;

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Messaging Insights</h1>
            <p className="text-muted-foreground">
              Track and analyze your SMS messaging performance
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Last 24 Hours</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isEmpty ? (
          <Card className="p-16 text-center border border-primary/30 bg-gradient-to-br from-primary/8 via-accent/5 to-secondary/8">
            <div className="flex justify-center mb-6">
              <div className="p-5 bg-primary/10 rounded-full">
                <BarChart3 className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-3">No Messages Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Start sending SMS messages to see analytics, insights, and
              performance metrics appear here.
            </p>
            <button
              onClick={() => navigate("/admin/conversations")}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Send Your First Message
            </button>
          </Card>
        ) : (
          <>
            {/* Key Metrics Row */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Total Messages
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {metrics.totalMessages}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      All time
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Messages Today
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {metrics.sentToday}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sent in this period
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Response Rate
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {metrics.responseRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {metrics.receivedToday} responses
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Avg Response Time
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {metrics.avgResponseTime > 0
                        ? `${metrics.avgResponseTime.toFixed(0)}m`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Minutes
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Daily Messages Chart */}
              <Card className="p-6 border hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold mb-6">
                  Daily Message Volume
                </h3>
                {metrics.dailyMessages.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.dailyMessages}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="sent"
                        stackId="a"
                        fill="#3b82f6"
                        name="Sent"
                      />
                      <Bar
                        dataKey="received"
                        stackId="a"
                        fill="#10b981"
                        name="Received"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </Card>

              {/* Message Status Distribution */}
              <Card className="p-6 border hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold mb-6">
                  Message Status Distribution
                </h3>
                {metrics.messagesByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.messagesByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, count }) => `${status} (${count})`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {metrics.messagesByStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getStatusColor(entry.status)}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </Card>
            </div>

            {/* Messages by Hour */}
            <Card className="p-6 border hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-6">Messages by Hour</h3>
              {metrics.messagesByHour.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metrics.messagesByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      name="Message Count"
                      dot={{ fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
