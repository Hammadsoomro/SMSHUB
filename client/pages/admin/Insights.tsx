import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, MessageSquare, Clock, Users } from "lucide-react";

export default function Insights() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Messaging Insights</h1>

        {/* Coming Soon Hero Section */}
        <Card className="p-16 text-center border border-primary/30 bg-gradient-to-br from-primary/8 via-accent/5 to-secondary/8 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full -ml-16 -mb-16" />

          <div className="relative">
            {/* Main Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-5 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl">
                <BarChart3 className="w-10 h-10 text-primary" />
              </div>
            </div>

            {/* Main Heading */}
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Advanced Analytics Coming Soon
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              We're building powerful analytics and messaging insights to help you understand your SMS campaigns better. Track performance, analyze trends, and optimize your communication strategy.
            </p>

            {/* Features Preview */}
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <div className="text-sm font-medium">Message Volume Tracking</div>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <Clock className="w-6 h-6 text-amber-600" />
                <div className="text-sm font-medium">Response Time Analytics</div>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-background/50 border border-border/50">
                <Users className="w-6 h-6 text-green-600" />
                <div className="text-sm font-medium">Team Performance Metrics</div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-8 inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
              🚀 Launching Q1 2025
            </div>
          </div>
        </Card>

        {/* Preview Cards - Disabled State */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-6 text-muted-foreground">
            Preview of upcoming insights metrics
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 opacity-40 hover:opacity-50 transition-opacity cursor-not-allowed">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Messages Today</p>
                  <p className="text-3xl font-bold mt-3 text-muted-foreground/60">—</p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">Available soon</p>
            </Card>

            <Card className="p-6 opacity-40 hover:opacity-50 transition-opacity cursor-not-allowed">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-3xl font-bold mt-3 text-muted-foreground/60">—</p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">Available soon</p>
            </Card>

            <Card className="p-6 opacity-40 hover:opacity-50 transition-opacity cursor-not-allowed">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-3xl font-bold mt-3 text-muted-foreground/60">—</p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">Available soon</p>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
