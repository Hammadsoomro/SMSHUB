import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TeamMemberLayout from "@/components/TeamMemberLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Loader2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  assignedTo?: string;
  purchasedAt: string;
  active: boolean;
}

export default function AssignedNumbers() {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    fetchAssignedNumbers();
  }, [navigate]);

  const fetchAssignedNumbers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/assigned-phone-number", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch assigned numbers");
      const data = await response.json();
      setNumbers(data.phoneNumbers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TeamMemberLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Assigned Numbers</h1>
          <p className="text-muted-foreground">
            View your assigned phone numbers and manage messages
          </p>
        </div>

        {error && (
          <Card className="p-6 bg-red-50 border-red-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {numbers.length === 0 && !error && (
          <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  No Numbers Assigned
                </h3>
                <p className="text-sm text-blue-700">
                  Your admin hasn't assigned any phone numbers to you yet.
                  Once assigned, they will appear here.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your numbers...</p>
            </div>
          </Card>
        ) : numbers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {numbers.map((num, index) => (
              <Card
                key={num.id || `phone-${index}`}
                className="p-6 border-primary/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-semibold text-lg">
                        {num.phoneNumber}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned on{" "}
                        {new Date(num.purchasedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      num.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {num.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/messages")}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Manage Messages
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No assigned numbers yet</p>
          </Card>
        )}
      </div>
    </TeamMemberLayout>
  );
}
