import { Contact, Message, PhoneNumber, User } from "@shared/api";

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
    const response = await fetch(endpoint, {
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
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      // Admin: get all numbers, Team member: get assigned numbers
      if (user?.role === "admin") {
        try {
          const response = await this.request<{ numbers: PhoneNumber[] }>(
            "/api/admin/numbers",
          );
          return response.numbers || [];
        } catch (error: any) {
          console.error("Failed to get admin phone numbers:", error);
          return [];
        }
      } else {
        // Team member: get only assigned numbers
        try {
          const response = await this.request<{ phoneNumbers: PhoneNumber[] }>(
            "/api/messages/assigned-phone-number",
          );
          return response.phoneNumbers || [];
        } catch (error: any) {
          console.error("Failed to get assigned phone numbers:", error);
          return [];
        }
      }
    } catch (error) {
      console.error("Failed to get accessible phone numbers:", error);
      return [];
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
}

export default new ApiService();
