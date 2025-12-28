import { Contact, Message, PhoneNumber, User } from "@shared/api";
import { API_BASE_URL } from "@/config/api";

interface Wallet {
  balance: number;
  currency: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private getAuthHeader() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeader(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  async getProfile(): Promise<User> {
    const response = await this.request<{ user: User }>("/api/auth/profile");
    return response.user;
  }

  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const response = await this.request<{ numbers: PhoneNumber[] }>(
      "/api/admin/numbers",
    );
    return response.numbers || [];
  }

  async getAccessiblePhoneNumbers(): Promise<PhoneNumber[]> {
    try {
      // Try to get all numbers (admin endpoint)
      const response = await this.request<{ numbers: PhoneNumber[] }>(
        "/api/admin/numbers",
      );
      console.log("[ApiService] Loaded phone numbers for admin:", response.numbers);
      return response.numbers || [];
    } catch (adminError: any) {
      console.log(
        "[ApiService] Admin endpoint failed (expected for team members), trying assigned endpoint...",
        adminError.message
      );
      // If admin endpoint fails (team member), get assigned number
      try {
        const response = await this.request<{ phoneNumbers: PhoneNumber[] }>(
          "/api/messages/assigned-phone-number",
        );
        console.log("[ApiService] Loaded assigned phone numbers for team member:", response.phoneNumbers);
        return response.phoneNumbers || [];
      } catch (assignedError) {
        console.error(
          "[ApiService] Failed to get assigned phone numbers:",
          assignedError instanceof Error ? assignedError.message : String(assignedError)
        );
        // Return empty array if both fail - the page will show "No phone numbers available"
        return [];
      }
    }
  }

  async getContacts(phoneNumberId: string): Promise<Contact[]> {
    const response = await this.request<{ contacts: Contact[] }>(
      `/api/messages/contacts?phoneNumberId=${encodeURIComponent(phoneNumberId)}`,
    );
    return response.contacts || [];
  }

  async getMessages(
    contactId: string,
    phoneNumber?: string,
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    if (phoneNumber) {
      params.append("phoneNumber", phoneNumber);
    }
    const queryString = params.toString();
    const url = queryString
      ? `/api/messages/conversation/${contactId}?${queryString}`
      : `/api/messages/conversation/${contactId}`;

    const response = await this.request<{ messages: Message[] }>(url);
    return response.messages || [];
  }

  async markAsRead(contactId: string): Promise<void> {
    await this.request(`/api/messages/mark-read/${contactId}`, {
      method: "POST",
    });
  }

  async sendSMS(
    contactId: string,
    message: string,
    phoneNumberId: string,
  ): Promise<Message> {
    const response = await this.request<{ message: Message }>(
      "/api/messages/send",
      {
        method: "POST",
        body: JSON.stringify({
          to: contactId,
          body: message,
          phoneNumberId,
        }),
      },
    );
    return response.message;
  }

  async addContact(
    name: string,
    phoneNumber: string,
    phoneNumberId: string,
  ): Promise<Contact> {
    const response = await this.request<{ contact: Contact }>("/api/contacts", {
      method: "POST",
      body: JSON.stringify({
        name,
        phoneNumber,
        phoneNumberId,
      }),
    });
    return response.contact;
  }

  async updateContact(
    contactId: string,
    updates: Partial<Contact>,
  ): Promise<Contact> {
    const response = await this.request<{ contact: Contact }>(
      `/api/contacts/${contactId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );
    return response.contact;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.request(`/api/contacts/${contactId}`, {
      method: "DELETE",
    });
  }

  async setActiveNumber(phoneNumberId: string): Promise<PhoneNumber> {
    const response = await this.request<{ number: PhoneNumber }>(
      "/api/admin/numbers/set-active",
      {
        method: "POST",
        body: JSON.stringify({ phoneNumberId }),
      },
    );
    return response.number;
  }

  async getWallet(): Promise<Wallet> {
    const response = await this.request<{ wallet: Wallet }>("/api/wallet");
    return response.wallet;
  }

  async getTwilioBalance(): Promise<{
    balance: number | null;
    currency: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        balance: number | null;
        currency: string;
      }>("/api/wallet/twilio-balance");
      return response;
    } catch (error: any) {
      return {
        balance: null,
        currency: "USD",
        error:
          error instanceof Error ? error.message : "Failed to fetch balance",
      };
    }
  }
}

export default new ApiService();
