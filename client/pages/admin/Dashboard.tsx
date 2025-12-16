import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Phone,
  Users,
  MessageSquare,
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TeamMember } from "@shared/api";

interface DashboardStats {
  activeNumbers: number;
  teamMembersCount: number;
  teamMembers: TeamMember[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch("/api/admin/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Unauthorized - Please log in again");
          } else {
            setError("Failed to fetch dashboard statistics");
          }
          return;
        }

        const data = await response.json();
        setStats(data.stats);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError("Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const teamMemberActivityData = stats?.teamMembers.map((member) => ({
    name: member.name.split(" ")[0],
    status: member.status === "active" ? 100 : 50,
    joinDate: new Date(member.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  })) || [{ name: "Team", status: 0, joinDate: "N/A" }];

  const teamMemberCountByStatus = [
    {
      name: "Active",
      value:
        stats?.teamMembers.filter((m) => m.status === "active").length || 0,
      color: "#3b82f6",
    },
    {
      name: "Pending",
      value:
        stats?.teamMembers.filter((m) => m.status === "pending").length || 0,
      color: "#f59e0b",
    },
  ];

  const timelineData = [
    { name: "Week 1", activities: 12, messages: 24 },
    { name: "Week 2", activities: 18, messages: 35 },
    { name: "Week 3", activities: 15, messages: 28 },
    { name: "Week 4", activities: 22, messages: 42 },
  ];

  const StatCard = ({
    title,
    value,
    icon: Icon,
    bgColor,
    textColor,
    loading: isLoading,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
    loading?: boolean;
  }) => (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-3xl font-bold">
            {isLoading ? <span className="animate-pulse">...</span> : value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <div className={textColor}>{Icon}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's your business overview
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="p-4 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Numbers"
            value={stats?.activeNumbers ?? 0}
            icon={<Phone className="w-6 h-6" />}
            bgColor="bg-primary/10"
            textColor="text-primary"
            loading={loading}
          />
          <StatCard
            title="Team Members"
            value={stats?.teamMembersCount ?? 0}
            icon={<Users className="w-6 h-6" />}
            bgColor="bg-secondary/10"
            textColor="text-secondary"
            loading={loading}
          />
          <StatCard
            title="Messages Today"
            value="View"
            icon={<MessageSquare className="w-6 h-6" />}
            bgColor="bg-accent/10"
            textColor="text-accent"
            loading={loading}
          />
          <StatCard
            title="Analytics"
            value="Active"
            icon={<BarChart3 className="w-6 h-6" />}
            bgColor="bg-primary/10"
            textColor="text-primary"
            loading={loading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Members Status Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Team Status</h2>
                <p className="text-sm text-muted-foreground">
                  Members by status
                </p>
              </div>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex justify-center">
              {teamMemberCountByStatus.some((item) => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={teamMemberCountByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {teamMemberCountByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} member(s)`, "Count"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] w-full">
                  <p className="text-muted-foreground">No team members yet</p>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-2">
              {teamMemberCountByStatus.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Team Members Activity Timeline */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Activity Timeline</h2>
                <p className="text-sm text-muted-foreground">
                  Weekly activity trends
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="activities"
                  fill="hsl(var(--primary))"
                  name="Activities"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="messages"
                  fill="hsl(var(--secondary))"
                  name="Messages"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Team Members List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                Your team at a glance
              </p>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          {stats && stats.teamMembers.length > 0 ? (
            <div className="space-y-3">
              {stats.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm font-medium">
                        {new Date(member.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        member.status === "active"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}
                    >
                      {member.status === "active" ? "Active" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No team members yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first team member from Team Management
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Welcome Section */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
              <p className="text-muted-foreground mb-6">
                Start by connecting your Twilio credentials to begin managing
                SMS messages. Once connected, you can purchase phone numbers and
                invite team members to manage conversations.
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    First, go to <strong>Credentials</strong> and add your
                    Twilio Account SID and Auth Token
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
                  <span>
                    Then navigate to <strong>Numbers</strong> to view and manage
                    your phone numbers
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0"></span>
                  <span>
                    Use <strong>Team Management</strong> to invite and manage
                    team members
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                  <span>
                    Check <strong>Account Info</strong> for your account details
                    and settings
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
