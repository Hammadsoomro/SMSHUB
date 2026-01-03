import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

export default function Insights() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Messaging Insights</h1>

        {/* Coming Soon */}
        <Card className="p-12 text-center border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Analytics Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're building comprehensive analytics and insights for your SMS
            messaging. Soon you'll be able to track message volume, response
            times, team performance, and more.
          </p>
        </Card>

        {/* Preview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card className="p-6 opacity-50">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Messages Today</p>
                <p className="text-2xl font-bold mt-2">0</p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 opacity-50">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold mt-2">0%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 opacity-50">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg Response Time
                </p>
                <p className="text-2xl font-bold mt-2">-</p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
