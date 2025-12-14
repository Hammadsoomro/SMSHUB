/**
 * Twilio integration utility
 * This will handle SMS sending and receiving through Twilio API
 */
import https from "https";

interface TwilioSMSRequest {
  To: string;
  From: string;
  Body: string;
}

interface TwilioResponse {
  sid?: string;
  error?: string;
  error_message?: string;
}

export class TwilioClient {
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
  }

  /**
   * Send an SMS message through Twilio
   */
  async sendSMS(
    to: string,
    from: string,
    body: string,
  ): Promise<TwilioResponse> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      const postData = new URLSearchParams({
        To: to,
        From: from,
        Body: body,
      }).toString();

      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Get available phone numbers from Twilio
   */
  async getAvailableNumbers(countryCode: string = "US"): Promise<any> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      // Build query string - Twilio requires at least one search criterion
      // For international numbers, we use distance search with a large radius
      // You can also add NearNumber, NearLatLong, or other parameters
      const query = new URLSearchParams({
        Limit: "50",
      }).toString();

      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${this.accountSid}/AvailablePhoneNumbers/${countryCode}/Local.json?${query}`,
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);

            // Handle HTTP error status codes
            if (res.statusCode && res.statusCode >= 400) {
              return resolve({
                error: response.code || response.message || "Twilio API error",
                error_message:
                  response.message ||
                  `HTTP ${res.statusCode}: ${response.detail || "Error"}`,
                status_code: res.statusCode,
              });
            }

            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Purchase a phone number from Twilio
   */
  async purchasePhoneNumber(phoneNumber: string): Promise<TwilioResponse> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      const postData = new URLSearchParams({
        PhoneNumber: phoneNumber,
      }).toString();

      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${this.accountSid}/IncomingPhoneNumbers.json`,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}
