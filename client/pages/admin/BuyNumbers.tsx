import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  Phone,
  Loader2,
  Search,
  Check,
  MessageSquare,
  Image,
  PhoneCall,
} from "lucide-react";
import { AvailablePhoneNumber } from "@shared/api";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
];

const STATES_BY_COUNTRY: Record<
  string,
  Array<{ code: string; name: string }>
> = {
  US: [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" },
  ],
  CA: [
    { code: "AB", name: "Alberta" },
    { code: "BC", name: "British Columbia" },
    { code: "MB", name: "Manitoba" },
    { code: "NB", name: "New Brunswick" },
    { code: "NL", name: "Newfoundland and Labrador" },
    { code: "NS", name: "Nova Scotia" },
    { code: "ON", name: "Ontario" },
    { code: "PE", name: "Prince Edward Island" },
    { code: "QC", name: "Quebec" },
    { code: "SK", name: "Saskatchewan" },
  ],
  GB: [
    { code: "LONDON", name: "London" },
    { code: "MANCHESTER", name: "Manchester" },
    { code: "LIVERPOOL", name: "Liverpool" },
    { code: "BIRMINGHAM", name: "Birmingham" },
  ],
  AU: [
    { code: "NSW", name: "New South Wales" },
    { code: "VIC", name: "Victoria" },
    { code: "QLD", name: "Queensland" },
    { code: "SA", name: "South Australia" },
    { code: "WA", name: "Western Australia" },
    { code: "TAS", name: "Tasmania" },
    { code: "ACT", name: "Australian Capital Territory" },
    { code: "NT", name: "Northern Territory" },
  ],
  DE: [],
  ES: [],
  FR: [],
};

interface CapabilityFilters {
  voice: boolean;
  sms: boolean;
  mms: boolean;
  fax: boolean;
}

export default function BuyNumbers() {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [availableNumbers, setAvailableNumbers] = useState<
    AvailablePhoneNumber[]
  >([]);
  const [twilioBalance, setTwilioBalance] = useState<number | null>(null);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);
  const [purchasedNumbers, setPurchasedNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [capabilityFilters, setCapabilityFilters] = useState<CapabilityFilters>(
    {
      voice: false,
      sms: false,
      mms: false,
      fax: false,
    },
  );

  useEffect(() => {
    const validateAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }
        await fetchTwilioBalance();
        setIsLoading(false);
      } catch {
        navigate("/login", { replace: true });
      }
    };

    validateAuth();
  }, [navigate]);

  const fetchTwilioBalance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/twilio-balance", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTwilioBalance(data.balance || 0);
      }
    } catch (err) {
      console.error("Error fetching Twilio balance:", err);
    }
  };

  const fetchAvailableNumbers = async (countryCode: string, state?: string) => {
    if (!countryCode) return;

    setIsLoadingNumbers(true);
    setError("");
    setAvailableNumbers([]);
    setSearchTerm("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const params = new URLSearchParams({ countryCode });
      if (state) {
        params.append("state", state);
      }

      const url = `/api/admin/available-numbers?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          // Error response parse failure
        }
        setError(errorMessage);
        return;
      }

      const data = await response.json();

      if (!data || typeof data !== "object") {
        setError("Invalid response from server");
        return;
      }

      const numbers = Array.isArray(data.numbers) ? data.numbers : [];
      setAvailableNumbers(numbers);

      if (numbers.length === 0) {
        setError(
          "No available numbers for this country. Please check your Twilio account.",
        );
      }
    } catch (err) {
      let errorMessage = "Failed to fetch numbers";
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        errorMessage =
          "Network error: Unable to reach the API. Please check your internet connection or try again later.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedState(""); // Reset state when country changes
    setAvailableNumbers([]);
    setSearchTerm("");
    fetchAvailableNumbers(value);
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setAvailableNumbers([]);
    setSearchTerm("");
    fetchAvailableNumbers(selectedCountry, value);
  };

  const handlePurchaseNumber = async (number: AvailablePhoneNumber) => {
    if (twilioBalance === null) {
      setError(
        "Twilio balance information not loaded. Please refresh the page.",
      );
      return;
    }

    const cost = parseFloat(number.cost);
    if (isNaN(cost)) {
      setError("Invalid number cost");
      return;
    }

    if (twilioBalance < cost) {
      setError(
        `Insufficient Twilio balance. Need $${cost.toFixed(2)}, have $${twilioBalance.toFixed(2)}`,
      );
      return;
    }

    setPurchasingNumber(number.phoneNumber);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch("/api/admin/purchase-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: number.phoneNumber,
          cost: cost,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to purchase number");
      }

      // Refetch Twilio balance after purchase
      await fetchTwilioBalance();

      setPurchasedNumbers((prev) => new Set(prev).add(number.phoneNumber));
      setSuccess(`✅ Successfully purchased ${number.phoneNumber}`);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while purchasing";
      setError(errorMessage);
    } finally {
      setPurchasingNumber(null);
    }
  };

  const isActiveFilter = (filter: keyof CapabilityFilters) =>
    capabilityFilters[filter];

  const hasAnyFilterEnabled = Object.values(capabilityFilters).some(
    (value) => value === true,
  );

  const matchesCapabilityFilter = (num: AvailablePhoneNumber): boolean => {
    if (!hasAnyFilterEnabled) return true;

    const caps = num.capabilities || {};
    if (capabilityFilters.voice && !caps.voice) return false;
    if (capabilityFilters.sms && !caps.SMS) return false;
    if (capabilityFilters.mms && !caps.MMS) return false;
    if (capabilityFilters.fax) return false; // Fax not available from Twilio

    return true;
  };

  const filteredNumbers = availableNumbers.filter(
    (num) =>
      (num.phoneNumber.includes(searchTerm) ||
        (num.locality &&
          num.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (num.region &&
          num.region.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      matchesCapabilityFilter(num),
  );

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
            <h1 className="text-3xl font-bold mb-2">Buy Phone Numbers</h1>
            <p className="text-muted-foreground">
              Purchase Twilio phone numbers from multiple countries
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="p-6 bg-red-50 border-2 border-red-300 mb-8 animate-shake">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Success Message */}
        {success && (
          <Card className="p-6 bg-green-50 border-2 border-green-300 mb-8">
            <div className="flex gap-4">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Success</h3>
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Country Selection */}
        <Card className="p-8 mb-8 border-2">
          <h2 className="text-lg font-semibold mb-6">Select Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Country
              </label>
              <Select
                value={selectedCountry}
                onValueChange={handleCountryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a country..." />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State Selection - Show only if country is selected and has states */}
            {selectedCountry &&
              STATES_BY_COUNTRY[selectedCountry]?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    {selectedCountry === "US"
                      ? "State"
                      : selectedCountry === "CA"
                        ? "Province"
                        : "Region"}
                  </label>
                  <Select
                    value={selectedState}
                    onValueChange={handleStateChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={`Choose a ${selectedCountry === "US" ? "state" : selectedCountry === "CA" ? "province" : "region"}...`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES_BY_COUNTRY[selectedCountry].map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
          </div>
        </Card>

        {/* Search */}
        {availableNumbers.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by number, locality or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
        )}

        {/* Capability Filters */}
        {availableNumbers.length > 0 && (
          <Card className="p-6 mb-6 bg-muted/50 border-l-4 border-l-primary">
            <h3 className="text-sm font-semibold mb-4">
              Filter by Capabilities
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  id: "voice" as const,
                  label: "Voice",
                  icon: PhoneCall,
                  color: "text-green-600",
                  disabled: false,
                },
                {
                  id: "sms" as const,
                  label: "SMS",
                  icon: MessageSquare,
                  color: "text-blue-600",
                  disabled: false,
                },
                {
                  id: "mms" as const,
                  label: "MMS",
                  icon: Image,
                  color: "text-purple-600",
                  disabled: false,
                },
                {
                  id: "fax" as const,
                  label: "Fax",
                  icon: Phone,
                  color: "text-orange-600",
                  disabled: true,
                },
              ].map((capability) => {
                const Icon = capability.icon;
                return (
                  <div
                    key={capability.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      capability.disabled
                        ? "border-muted opacity-50 cursor-not-allowed bg-muted/30"
                        : "border-border hover:bg-background cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!capability.disabled) {
                        setCapabilityFilters((prev) => ({
                          ...prev,
                          [capability.id]: !prev[capability.id],
                        }));
                      }
                    }}
                  >
                    <Checkbox
                      checked={capabilityFilters[capability.id]}
                      onCheckedChange={(checked) => {
                        if (!capability.disabled) {
                          setCapabilityFilters((prev) => ({
                            ...prev,
                            [capability.id]: checked === true,
                          }));
                        }
                      }}
                      disabled={capability.disabled}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className={`w-4 h-4 ${capability.color}`} />
                      <span className="text-sm font-medium">
                        {capability.label}
                        {capability.disabled && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            (Not Available)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasAnyFilterEnabled && (
              <button
                onClick={() =>
                  setCapabilityFilters({
                    voice: false,
                    sms: false,
                    mms: false,
                    fax: false,
                  })
                }
                className="text-xs text-primary hover:underline mt-3"
              >
                Clear filters
              </button>
            )}
          </Card>
        )}

        {/* Loading State */}
        {isLoadingNumbers && (
          <Card className="p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                Fetching available numbers...
              </p>
            </div>
          </Card>
        )}

        {/* Numbers Grid */}
        {!isLoadingNumbers && selectedCountry && filteredNumbers.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {filteredNumbers.length} available number
              {filteredNumbers.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid gap-4">
              {filteredNumbers.map((num, idx) => {
                const cost = parseFloat(num.cost);
                const hasBalance =
                  twilioBalance !== null && twilioBalance >= cost;
                const isPurchased = purchasedNumbers.has(num.phoneNumber);

                return (
                  <Card
                    key={idx}
                    className={`p-6 border-l-4 hover:shadow-lg smooth-transition ${
                      isPurchased
                        ? "border-l-green-500 bg-green-50"
                        : hasBalance
                          ? "border-l-primary hover:border-l-secondary"
                          : "border-l-muted opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Phone className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-mono font-semibold text-lg">
                            {num.phoneNumber}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {num.locality || "N/A"}
                            {num.region && `, ${num.region}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Monthly cost:{" "}
                            <span className="font-semibold">
                              ${cost.toFixed(2)}
                            </span>
                          </p>

                          {/* Capabilities */}
                          {num.capabilities && (
                            <div className="flex gap-3 mt-3 flex-wrap">
                              {num.capabilities.SMS && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  <MessageSquare className="w-3 h-3" />
                                  SMS
                                </div>
                              )}
                              {num.capabilities.MMS && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                  <Image className="w-3 h-3" />
                                  MMS
                                </div>
                              )}
                              {num.capabilities.voice && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  <PhoneCall className="w-3 h-3" />
                                  Voice
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        {isPurchased ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Purchased
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate("/admin/numbers")}
                            >
                              Manage
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold">
                              ${cost.toFixed(2)}
                            </p>
                            <Button
                              size="sm"
                              disabled={
                                !hasBalance ||
                                purchasingNumber === num.phoneNumber
                              }
                              onClick={() => handlePurchaseNumber(num)}
                              className="bg-gradient-to-r from-primary to-secondary"
                            >
                              {purchasingNumber === num.phoneNumber ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Buying...
                                </>
                              ) : !hasBalance ? (
                                "No Balance"
                              ) : (
                                "Buy"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingNumbers &&
          selectedCountry &&
          availableNumbers.length > 0 &&
          filteredNumbers.length === 0 && (
            <Card className="p-12 text-center">
              <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No numbers matching your search
              </p>
            </Card>
          )}

        {/* No Country Selected */}
        {!selectedCountry && (
          <Card className="p-12 text-center">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">
              Select a country to view available numbers
            </p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
