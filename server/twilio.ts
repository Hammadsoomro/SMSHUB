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
   * @param areaCodeIndex - Which area code to use (0, 1, 2, etc) for fallback
   * @param state - State/region code (e.g., CA, NY, BC, ON)
   */
  async getAvailableNumbers(
    countryCode: string = "US",
    areaCodeIndex: number = 0,
    state?: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      // State to area code mappings
      const US_STATE_AREA_CODES: Record<string, string[]> = {
        AL: ["205", "251", "334"],
        AK: ["907"],
        AZ: ["480", "602", "623", "928"],
        AR: ["479", "501", "870"],
        CA: [
          "209",
          "213",
          "310",
          "323",
          "408",
          "415",
          "510",
          "530",
          "559",
          "619",
          "626",
          "650",
          "661",
          "707",
          "714",
          "760",
          "805",
          "818",
          "831",
          "858",
          "916",
          "925",
          "949",
        ],
        CO: ["303", "719", "720", "970"],
        CT: ["203", "475", "860"],
        DE: ["302"],
        FL: [
          "239",
          "305",
          "321",
          "352",
          "386",
          "407",
          "561",
          "727",
          "772",
          "813",
          "850",
          "863",
          "904",
          "941",
        ],
        GA: ["229", "404", "470", "478", "678", "706", "770", "912"],
        HI: ["808"],
        ID: ["208"],
        IL: [
          "217",
          "224",
          "309",
          "312",
          "331",
          "618",
          "630",
          "708",
          "773",
          "815",
        ],
        IN: ["219", "260", "317", "463", "574", "765", "812", "930"],
        IA: ["319", "515", "563", "641", "712"],
        KS: ["316", "620", "785", "913"],
        KY: ["270", "364", "502", "606", "859"],
        LA: ["225", "318", "337", "504", "985"],
        ME: ["207"],
        MD: ["240", "301", "410", "667"],
        MA: ["339", "351", "413", "508", "617", "774", "781", "857"],
        MI: [
          "231",
          "248",
          "269",
          "313",
          "517",
          "586",
          "616",
          "734",
          "810",
          "906",
          "989",
        ],
        MN: ["218", "320", "507", "612", "651", "763", "952"],
        MS: ["228", "601", "662"],
        MO: ["314", "417", "573", "636", "660", "816", "975"],
        MT: ["406"],
        NE: ["308", "402", "531"],
        NV: ["702", "725", "775"],
        NH: ["603"],
        NJ: ["201", "609", "732", "856", "908", "973"],
        NM: ["505", "575"],
        NY: [
          "212",
          "315",
          "347",
          "516",
          "518",
          "585",
          "607",
          "631",
          "716",
          "718",
          "845",
          "914",
        ],
        NC: ["252", "336", "704", "828", "910", "919", "980"],
        ND: ["701"],
        OH: [
          "216",
          "220",
          "330",
          "380",
          "419",
          "440",
          "513",
          "567",
          "614",
          "740",
          "937",
        ],
        OK: ["405", "539", "580", "918"],
        OR: ["503", "541", "971"],
        PA: ["215", "267", "412", "484", "570", "610", "717", "724", "814"],
        RI: ["401"],
        SC: ["803", "843", "864"],
        SD: ["605"],
        TN: ["423", "615", "731", "865"],
        TX: [
          "210",
          "214",
          "254",
          "281",
          "325",
          "361",
          "409",
          "430",
          "432",
          "469",
          "512",
          "620",
          "682",
          "713",
          "737",
          "806",
          "817",
          "830",
          "903",
          "915",
          "936",
          "940",
          "956",
          "972",
          "979",
        ],
        UT: ["385", "435", "801"],
        VT: ["802"],
        VA: ["276", "434", "540", "571", "703", "757", "804"],
        WA: ["206", "253", "360", "425", "509"],
        WV: ["304"],
        WI: ["262", "414", "534", "608", "715", "920"],
        WY: ["307"],
      };

      const CA_PROVINCE_AREA_CODES: Record<string, string[]> = {
        AB: ["403", "587", "780", "825"],
        BC: ["236", "250", "604", "672", "778"],
        MB: ["204", "431"],
        NB: ["506"],
        NL: ["709"],
        NS: ["902", "782"],
        ON: [
          "226",
          "249",
          "289",
          "343",
          "365",
          "416",
          "437",
          "519",
          "613",
          "647",
          "705",
          "807",
          "905",
        ],
        PE: ["902"],
        QC: ["226", "438", "450", "514", "579", "581", "819", "873"],
        SK: ["306", "639"],
      };

      // Build query string based on country
      // Different countries require different search parameters
      const query = new URLSearchParams();

      // Add search criteria based on country
      // Try multiple area codes/regions - these are commonly available
      if (countryCode === "US") {
        // For US, use state-specific area codes
        let areaCodes: string[] = [];
        if (state && US_STATE_AREA_CODES[state]) {
          areaCodes = US_STATE_AREA_CODES[state];
        } else {
          // Fallback to general area codes
          areaCodes = ["415", "310"];
        }
        // Use the specified area code index, or fallback to first one
        const areaCode =
          areaCodes[Math.min(areaCodeIndex, areaCodes.length - 1)];
        query.append("AreaCode", areaCode);
      } else if (countryCode === "CA") {
        // For Canada, use province-specific area codes
        let areaCodes: string[] = [];
        if (state && CA_PROVINCE_AREA_CODES[state]) {
          areaCodes = CA_PROVINCE_AREA_CODES[state];
        } else {
          // Fallback to general area codes
          areaCodes = ["604", "416"];
        }
        // Use the specified area code index, or fallback to first one
        const areaCode =
          areaCodes[Math.min(areaCodeIndex, areaCodes.length - 1)];
        query.append("AreaCode", areaCode);
      } else if (countryCode === "AU") {
        // For Australia, use latitude/longitude based on selected state
        // NSW (Sydney): -33.8688, 151.2093
        // VIC (Melbourne): -37.8136, 144.9631
        // QLD (Brisbane): -27.4698, 153.0251
        // WA (Perth): -31.9505, 115.8605
        // SA (Adelaide): -34.9285, 138.6007
        // TAS (Hobart): -42.8821, 147.3272
        // ACT (Canberra): -35.2809, 149.1300
        // NT (Darwin): -12.4634, 130.8456

        const AU_STATE_COORDS: Record<string, { lat: string; lng: string }> = {
          NSW: { lat: "-33.8688", lng: "151.2093" }, // Sydney
          VIC: { lat: "-37.8136", lng: "144.9631" }, // Melbourne
          QLD: { lat: "-27.4698", lng: "153.0251" }, // Brisbane
          WA: { lat: "-31.9505", lng: "115.8605" }, // Perth
          SA: { lat: "-34.9285", lng: "138.6007" }, // Adelaide
          TAS: { lat: "-42.8821", lng: "147.3272" }, // Hobart
          ACT: { lat: "-35.2809", lng: "149.1300" }, // Canberra
          NT: { lat: "-12.4634", lng: "130.8456" }, // Darwin
        };

        let coords = AU_STATE_COORDS.NSW; // Default to Sydney
        if (state && AU_STATE_COORDS[state]) {
          coords = AU_STATE_COORDS[state];
        }

        query.append("NearLatLong", `${coords.lat},${coords.lng}`);
        // Increase distance on fallback attempts
        query.append("Distance", areaCodeIndex > 0 ? "100" : "50");
      } else if (countryCode === "GB") {
        // For UK, use latitude/longitude for London
        query.append("NearLatLong", "51.5074,-0.1278");
        query.append("Distance", areaCodeIndex > 0 ? "100" : "50");
      } else if (countryCode === "DE") {
        // For Germany, use latitude/longitude for Berlin
        query.append("NearLatLong", "52.5200,13.4050");
        query.append("Distance", areaCodeIndex > 0 ? "100" : "50");
      } else if (countryCode === "FR") {
        // For France, use latitude/longitude for Paris
        query.append("NearLatLong", "48.8566,2.3522");
        query.append("Distance", areaCodeIndex > 0 ? "100" : "50");
      } else if (countryCode === "ES") {
        // For Spain, use latitude/longitude for Madrid
        query.append("NearLatLong", "40.4168,-3.7038");
        query.append("Distance", areaCodeIndex > 0 ? "100" : "50");
      } else {
        // Default fallback
        const areaCodes = ["415", "310"];
        const areaCode =
          areaCodes[Math.min(areaCodeIndex, areaCodes.length - 1)];
        query.append("AreaCode", areaCode);
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
   * Get account balance from Twilio
   * Uses the Balance endpoint which returns the actual balance information
   */
  async getAccountBalance(): Promise<number> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      // Use the Balance endpoint, not the Account endpoint
      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${this.accountSid}/Balance.json`,
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

            // Check for HTTP errors first
            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new Error(
                  `Twilio API error: ${response.message || "Unknown error"}`,
                ),
              );
            }

            // The Balance endpoint returns balance as a string (negative number for credit)
            // Try different field names that Twilio might use
            let balanceRaw = response.balance;

            if (balanceRaw === undefined || balanceRaw === null) {
              return reject(
                new Error(
                  `Balance field not found in Twilio Balance API response. Available fields: ${Object.keys(response).join(", ")}`,
                ),
              );
            }

            // Twilio returns balance as a negative number (credit)
            // Example: -71.4305 means $71.4305 available
            const balanceValue = Math.abs(parseFloat(balanceRaw));

            // Validate that the parsed value is a valid number
            if (isNaN(balanceValue)) {
              return reject(
                new Error(
                  `Invalid balance value from Twilio API: ${balanceRaw}`,
                ),
              );
            }

            resolve(balanceValue);
          } catch (error) {
            console.error("Error parsing Twilio response:", error);
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

  /**
   * Get all incoming phone numbers from the Twilio account
   * Returns array of phone numbers in E.164 format
   */
  async getAllIncomingPhoneNumbers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        "base64",
      );

      const options = {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${this.accountSid}/IncomingPhoneNumbers.json?Limit=100`,
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

            // Handle HTTP errors
            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new Error(
                  `Twilio API error: ${response.message || "Failed to fetch phone numbers"}`,
                ),
              );
            }

            // Extract phone numbers from the response
            const phoneNumbers =
              response.incoming_phone_numbers?.map(
                (num: any) => num.phone_number,
              ) || [];

            resolve(phoneNumbers);
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
   * Verify that a phone number belongs to this Twilio account
   * Returns true if the number is in the account's incoming phone numbers
   */
  async verifyPhoneNumberOwnership(phoneNumber: string): Promise<boolean> {
    try {
      const allNumbers = await this.getAllIncomingPhoneNumbers();
      // Check if the number exists (may be in different format)
      return allNumbers.some((num) => {
        // Normalize both numbers for comparison
        const normalized1 = num.replace(/\D/g, "");
        const normalized2 = phoneNumber.replace(/\D/g, "");
        return normalized1 === normalized2;
      });
    } catch (error) {
      console.error("Error verifying phone number ownership:", error);
      return false;
    }
  }
}
