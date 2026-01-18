# Phone Purchase Troubleshooting Guide

This guide helps you debug issues when purchasing phone numbers from Twilio through conneclify.

## Overview

When you click "Buy" on a phone number in conneclify, the app:

1. ✅ Checks your Twilio credentials are valid
2. ✅ Verifies you have sufficient balance
3. ✅ **Calls the Twilio API** to purchase the number
4. ✅ Stores the purchased number in your conneclify database

**Important:** If the Twilio API call fails, the number should NOT be added to your database.

## Common Issues

### Issue 1: "This number is already purchased by you"

**Problem:** You can see the number in conneclify, but it's not actually in your Twilio account.

**Cause:** A previous purchase failed silently, but the app still added it to the database.

**Solution:**

1. Go to **Admin → Bought Numbers**
2. Delete the number from conneclify
3. Check your Twilio balance is sufficient
4. Try purchasing again

### Issue 2: "Insufficient Twilio balance"

**Problem:** Balance check says you don't have enough money.

**Cause:** Your Twilio account balance is too low.

**Solution:**

1. Go to **Admin → Twilio Balance**
2. Add credit to your Twilio account
3. Wait 2-3 minutes for balance to update
4. Try purchasing again

### Issue 3: "Purchase failed" with no specific error

**Problem:** Generic error message without details.

**Cause:** Could be several things - we need to check the server logs.

**Solution:**

1. **Check server logs** for `[Purchase]` messages:
   ```
   Look for entries like:
   [Purchase] Starting purchase process
   [Purchase] Twilio purchase failed
   [Purchase] ❌ Purchase number error
   ```

2. **Screenshot the error message** and share it

3. If no error message shown, refresh the page and try again

### Issue 4: Number appears in conneclify but not in Twilio

**Problem:** The number shows up in your "Bought Numbers" but not in Twilio account.

**Cause:** The Twilio API purchase failed, but the app added it to the database anyway.

**Solution:**

1. Go to **Admin → Bought Numbers**
2. Find the number that's not in Twilio
3. Delete it from conneclify
4. Check Twilio server logs for what went wrong
5. Try again

## Debug Endpoint

There's a debug endpoint to test your Twilio connection:

**URL:**
```
GET /api/admin/twilio-debug
```

**How to use:**

1. Open your browser console (F12)
2. Go to the Network tab
3. Visit: `https://conneclify.com/api/admin/twilio-debug`
4. Look for the response - it should show:
   ```json
   {
     "hasCredentials": true,
     "accountSid": "AC****...",
     "balance": 71.43,
     "status": "SUCCESS"
   }
   ```

**If you see errors:**
- `BALANCE_FETCH_FAILED` - Twilio credentials are wrong or API is down
- `No Twilio credentials found` - You haven't connected your Twilio account yet

## Checking Server Logs

When you try to purchase a number, the server logs detailed information:

### Success Log Example:
```
[Purchase] Starting purchase process
[Purchase] Phone number: +14155552671
[Purchase] Cost: 1.00
[Purchase] Admin ID: user_123
[Purchase] Account SID: ACXXXX...
[Purchase] Calling Twilio API to purchase number...
[Twilio] Purchase successful. Phone: +14155552671 SID: PN123abc...
[Purchase] ✅ Twilio purchase successful. SID: PN123abc...
[Purchase] Adding phone number to database...
[Purchase] ✅ Phone number successfully added to database and purchased from Twilio
```

### Failure Log Example:
```
[Purchase] Starting purchase process
[Purchase] Phone number: +14155552671
[Purchase] Cost: 1.00
[Purchase] Calling Twilio API to purchase number...
[Purchase] Twilio API response: {"code":20003, "message":"Account suspended...
[Purchase] ❌ Twilio purchase failed: Account suspended
```

## Verifying Twilio Credentials

Your Twilio credentials should be:
- **Account SID:** Starts with "AC" (e.g., ACxxxxxxxxxxxxxxxx)
- **Auth Token:** 32 characters of alphanumeric text

### To find your credentials:

1. Log into Twilio Console: https://www.twilio.com/console
2. Look for "Account SID" and "Auth Token" at the top
3. Copy both values
4. In conneclify, go **Admin → Settings → Twilio Credentials**
5. Paste them exactly (no extra spaces or quotes)
6. Click **Save**

### Common credential issues:

- ❌ Wrong Account SID (not starting with "AC")
- ❌ Wrong Auth Token (not 32 characters)
- ❌ Extra spaces before/after the values
- ❌ Credentials from a different Twilio account
- ❌ Auth Token changed (Twilio rotates tokens sometimes)

## Checking Twilio Account Status

Your Twilio account must be in good standing:

1. Log into Twilio Console: https://www.twilio.com/console
2. Look for warnings:
   - ⚠️ **Account suspended** - Contact Twilio support
   - ⚠️ **Account trial** - Trial accounts have limitations
   - ⚠️ **Balance negative** - Add credit to your account
   - ⚠️ **Payment failed** - Update payment method

## Twilio API Response Codes

When a purchase fails, you'll see an error code:

| Code | Meaning | Solution |
|------|---------|----------|
| 20001 | Invalid Account SID | Check your Account SID is correct |
| 20003 | Account suspended/disabled | Contact Twilio support |
| 20005 | Invalid phone number format | Number should be in E.164 format (+1234567890) |
| 21211 | Invalid phone number | This number is not available |
| 21452 | Cannot purchase this number | Number may not be available in your region |
| 20029 | Insufficient balance | Add credit to your Twilio account |
| 30001 | Authentication error | Your Auth Token may be invalid |

## Step-by-Step Debugging

**Step 1: Verify Credentials**
- Go to Admin Settings
- Check your Twilio Account SID and Auth Token are correct
- Test with the debug endpoint

**Step 2: Check Balance**
- Go to Admin → Twilio Balance
- Verify you have sufficient funds
- Add credit if needed

**Step 3: Try Purchasing**
- Go to Admin → Buy Numbers
- Select a number
- Click Buy
- Check for error messages

**Step 4: Check Server Logs**
- Look for `[Purchase]` messages
- Look for `[Twilio]` messages
- Note the full error message

**Step 5: Verify in Twilio**
- Log into Twilio Console
- Check if the number appears in "Manage → Phone Numbers"
- If not present, the purchase definitely failed

**Step 6: Report the Error**
- If still not working, save:
  - Error message from conneclify UI
  - Server log messages
  - Your Twilio Account SID (partial is OK)
  - The phone number you tried to purchase
  - Your current balance
  - Your Twilio account status

## What Should Happen

### Successful Purchase Flow:

1. **You click "Buy"** on a number
2. **App calls Twilio API** to purchase
3. **Twilio confirms** purchase and assigns a SID
4. **App saves** the number to its database
5. **You see success message:** "✅ Successfully purchased +1234567890"
6. **Number appears** in your "Bought Numbers" list
7. **Number appears** in your Twilio console

### Failed Purchase Flow:

1. **You click "Buy"** on a number
2. **App calls Twilio API** to purchase
3. **Twilio rejects** the request (insufficient balance, invalid credentials, etc.)
4. **App shows error message** with the reason
5. **Number is NOT added** to the database
6. **Number does NOT appear** in Twilio console
7. **You can try again** after fixing the issue

## Performance Check

The purchase should complete in **5-15 seconds**:

- 0-2 seconds: App validates credentials
- 2-3 seconds: Twilio API responds
- 3-5 seconds: App saves to database
- 5-15 seconds: Page updates

If it takes longer, check your internet connection.

## Contact Support

If you're still having issues:

1. **Twilio Support:** https://www.twilio.com/console/help-center
   - For Twilio API errors
   - For account suspension
   - For balance issues

2. **conneclify Support:** 
   - Share the error message
   - Share the server log output
   - Share your Twilio Account SID (partial is OK)

---

**Last Updated:** January 17, 2026
**Status:** ✅ Full Real Twilio API Integration
