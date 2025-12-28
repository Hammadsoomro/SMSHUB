import { RequestHandler } from "express";
import { storage } from "../storage";
import { Wallet, WalletTransaction } from "@shared/api";
import { TwilioClient } from "../twilio";

export const handleGetWallet: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const wallet = await storage.getOrCreateWallet(adminId);
    res.json({ wallet });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleAddFunds: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const { amount } = req.body as { amount: number };

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const wallet = await storage.getOrCreateWallet(adminId);
    const newBalance = wallet.balance + amount;

    await storage.updateWalletBalance(adminId, newBalance);

    const transaction: WalletTransaction = {
      id: storage.generateId(),
      adminId,
      type: "credit",
      amount,
      description: "Wallet fund added",
      createdAt: new Date().toISOString(),
    };

    await storage.addWalletTransaction(transaction);

    const updatedWallet = await storage.getWallet(adminId);
    res.json({ wallet: updatedWallet });
  } catch (error) {
    console.error("Add funds error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetTransactions: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;
    const transactions = await storage.getWalletTransactions(adminId);
    res.json({ transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetTwilioBalance: RequestHandler = async (req, res) => {
  try {
    const adminId = req.userId!;

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res.status(400).json({
        error: "Twilio credentials not connected",
        balance: null,
        currency: "USD",
      });
    }

    // Fetch balance from Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      credentials.authToken,
    );
    const balanceData = await twilioClient.getAccountBalance();

    if (balanceData.error) {
      return res.status(400).json({
        error: balanceData.error_message || balanceData.error,
        balance: null,
        currency: "USD",
      });
    }

    res.json({
      balance: parseFloat(balanceData.balance || "0"),
      currency: balanceData.currency || "USD",
    });
  } catch (error) {
    console.error("Get Twilio balance error:", error);
    res.status(500).json({
      error: "Failed to fetch Twilio balance",
      balance: null,
      currency: "USD",
    });
  }
};
