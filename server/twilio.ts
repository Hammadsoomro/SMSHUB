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
   * @param countryCode - ISO country code (US, CA, GB, AU, etc)
   * @param useFallback - If true, use alternative search parameters for fallback
   */
  async getAvailableNumbers(
    countryCode: string = "US",
    useFallback: boolean = false,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      // Build query string based on country
      // Different countries require different search parameters
      const query = new URLSearchParams();

      // Add search criteria based on country
      // Try multiple area codes/regions - these are commonly available
      if (countryCode === "US") {
        // For US, try different area codes: 415 (SF) first, then fallback to 310 (LA)
        const areaCode = useFallback ? "310" : "415";
        query.append("AreaCode", areaCode);
      } else if (countryCode === "CA") {
        // For Canada, try different area codes: 604 (Vancouver) first, then fallback to 416 (Toronto)
        const areaCode = useFallback ? "416" : "604";
        query.append("AreaCode", areaCode);
      } else if (countryCode === "GB") {
        // For UK, use latitude/longitude for London
        query.append("NearLatLong", "51.5074,-0.1278");
        query.append("Distance", useFallback ? "100" : "50");
      } else if (countryCode === "AU") {
        // For Australia, use latitude/longitude for Sydney
        query.append("NearLatLong", "-33.8688,151.2093");
        query.append("Distance", useFallback ? "100" : "50");
      } else if (countryCode === "DE") {
        // For Germany, use latitude/longitude for Berlin
        query.append("NearLatLong", "52.5200,13.4050");
        query.append("Distance", useFallback ? "100" : "50");
      } else if (countryCode === "FR") {
        // For France, use latitude/longitude for Paris
        query.append("NearLatLong", "48.8566,2.3522");
        query.append("Distance", useFallback ? "100" : "50");
      } else if (countryCode === "ES") {
        // For Spain, use latitude/longitude for Madrid
        query.append("NearLatLong", "40.4168,-3.7038");
        query.append("Distance", useFallback ? "100" : "50");
      } else {
        // Default fallback
        query.append("AreaCode", useFallback ? "310" : "415");
      }

      query.append("Limit", "50");

      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${this.accountSid}/AvailablePhoneNumbers/${countryCode}/Local.json?${query.toString()}`,
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
