import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { BarChart3, Phone, Users, MessageSquare } from "lucide-react";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Active Numbers</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Phone className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Team Members</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Users className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Messages Today</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Insights</p>
                <p className="text-3xl font-bold">View</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Welcome Section */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
          <h2 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h2>
          <p className="text-muted-foreground mb-6">
            Start by connecting your Twilio credentials to begin managing SMS messages. 
            Once connected, you can purchase phone numbers and invite team members to manage conversations.
          </p>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>First, go to <strong>Credentials</strong> and add your Twilio Account SID and Auth Token</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span>Then navigate to <strong>Numbers</strong> to view and manage your phone numbers</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              <span>Use <strong>Team Management</strong> to invite and manage team members</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>Check <strong>Account Info</strong> for your account details and settings</span>
            </li>
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
}
