import { RequestHandler } from "express";
import { storage } from "../storage";
import { TwilioClient } from "../twilio";
import { AvailablePhoneNumber, PhoneNumber } from "@shared/api";

// Country codes mapping for Twilio
const COUNTRY_CODES: Record<string, { code: string; name: string }> = {
  US: { code: "US", name: "United States" },
  CA: { code: "CA", name: "Canada" },
  GB: { code: "GB", name: "United Kingdom" },
  AU: { code: "AU", name: "Australia" },
  DE: { code: "DE", name: "Germany" },
  ES: { code: "ES", name: "Spain" },
  FR: { code: "FR", name: "France" },
};

export const handleGetAvailableNumbers: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { countryCode } = req.query as { countryCode: string };

    if (!countryCode || !COUNTRY_CODES[countryCode]) {
      return res.status(400).json({ error: "Invalid country code" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res.status(400).json({ error: "Please connect your Twilio credentials first" });
    }

    // Fetch available numbers from Twilio
    const twilioClient = new TwilioClient(credentials.accountSid, credentials.authToken);
    const availableNumbers = await twilioClient.getAvailableNumbers(countryCode);

    if (!availableNumbers || !availableNumbers.available_phone_numbers) {
      return res.json({ numbers: [] });
    }

    // Transform the response
    const numbers: AvailablePhoneNumber[] = availableNumbers.available_phone_numbers[0]?.available_phone_numbers.map((num: any) => ({
      phoneNumber: num.phone_number,
      friendlyName: num.friendly_name,
      locality: num.locality,
      region: num.region,
      postalCode: num.postal_code,
      countryCode: countryCode,
      cost: num.price || "0.00",
    })) || [];

    res.json({ numbers });
  } catch (error) {
    console.error("Get available numbers error:", error);
    res.status(500).json({ error: "Failed to fetch available numbers" });
  }
};

export const handlePurchaseNumber: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { phoneNumber, cost } = req.body as { phoneNumber: string; cost: number };

    if (!phoneNumber || cost === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if number is already purchased
    const existingNumber = await storage.getPhoneNumberById(phoneNumber);
    if (existingNumber) {
      return res.status(400).json({ error: "This number is already purchased" });
    }

    // Get wallet
    const wallet = await storage.getOrCreateWallet(adminId);
    if (wallet.balance < cost) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res.status(400).json({ error: "Please connect your Twilio credentials first" });
    }

    // Purchase number from Twilio
    const twilioClient = new TwilioClient(credentials.accountSid, credentials.authToken);
    const purchaseResponse = await twilioClient.purchasePhoneNumber(phoneNumber);

    if (purchaseResponse.error || purchaseResponse.error_message) {
      return res.status(400).json({ error: purchaseResponse.error_message || purchaseResponse.error });
    }

    // Deduct from wallet
    const newBalance = wallet.balance - cost;
    await storage.updateWalletBalance(adminId, newBalance);

    // Add transaction record
    await storage.addWalletTransaction({
      id: storage.generateId(),
      adminId,
      type: "debit",
      amount: cost,
      description: `Phone number purchased: ${phoneNumber}`,
      reference: phoneNumber,
      createdAt: new Date().toISOString(),
    });

    // Store phone number in database
    const newPhoneNumber: PhoneNumber = {
      id: storage.generateId(),
      adminId,
      phoneNumber,
      purchasedAt: new Date().toISOString(),
      active: true,
    };

    await storage.addPhoneNumber(newPhoneNumber);

    res.json({ phoneNumber: newPhoneNumber, wallet: { balance: newBalance } });
  } catch (error) {
    console.error("Purchase number error:", error);
    res.status(500).json({ error: "Failed to purchase number" });
  }
};
