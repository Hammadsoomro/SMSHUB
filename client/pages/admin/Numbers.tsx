import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Loader2, Search, Plus, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneNumber } from "@shared/api";

export default function Numbers() {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/numbers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch numbers");
      const data = await response.json();
      setNumbers(data.numbers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExistingNumber = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumberInput.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setIsAdding(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/add-existing-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber: phoneNumberInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add number");
      }

      const data = await response.json();
      setNumbers([...numbers, data.phoneNumber]);
      setPhoneNumberInput("");
      setShowAddForm(false);
      setSuccess(`✅ Number ${phoneNumberInput} added successfully!`);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAdding(false);
    }
  };

  const filteredNumbers = numbers.filter((num) =>
    num.phoneNumber.includes(searchTerm),
  );

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Phone Numbers</h1>
            <p className="text-muted-foreground">
              Manage your Twilio phone numbers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Existing
            </Button>
            <Button
              onClick={() => navigate("/admin/buy-numbers")}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Buy New Number
            </Button>
          </div>
        </div>

        {/* Add Existing Number Form */}
        {showAddForm && (
          <Card className="p-6 mb-8 border-primary/30">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Existing Phone Number</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <form onSubmit={handleAddExistingNumber} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+1 825 435 1943"
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value)}
                  disabled={isAdding}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the full phone number (e.g., +1 825 435 1943)
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isAdding}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Number
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Info Card */}
        {numbers.length === 0 && (
          <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  No Numbers Yet
                </h3>
                <p className="text-sm text-blue-700">
                  First connect your Twilio credentials in the Credentials
                  section, then you can purchase and manage phone numbers here.
                </p>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Card className="p-6 bg-red-50 border-red-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {/* Search */}
        {numbers.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
        )}

        {/* Numbers List */}
        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading numbers...</p>
            </div>
          </Card>
        ) : filteredNumbers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNumbers.map((num) => (
              <Card
                key={num.id}
                className="p-6 border-primary/20 hover:shadow-lg smooth-transition"
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
                        Purchased{" "}
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

                {num.assignedTo && (
                  <div className="mb-4 p-3 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">Assigned to</p>
                    <p className="font-medium">Team Member</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    {num.assignedTo ? "Reassign" : "Assign"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Settings
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No numbers found</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
