# 📋 Environment Variables Guide - Netlify Deployment

**جہاں Set کریں**: Netlify Dashboard → Site Settings → Build & Deploy → Environment

---

## ✅ REQUIRED (لازمی) - Production میں ضرور چاہیے

### 1. **MONGODB_URI** (لازمی)

- **کیا ہے**: MongoDB database کا connection string
- **کہاں سے ملے**: MongoDB Atlas console
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
- **تمہارا موجودہ value**:
  ```
  mongodb+srv://Hammad:1992@cluster0.bqlcjok.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
  ```
- **Status**: ✅ آپ کے پاس پہلے سے موجود ہے

---

### 2. **JWT_SECRET** (لازمی)

- **کیا ہے**: Login tokens کو sign کرنے کے لیے secret key
- **کیوں**: بغیر اس کے login/authentication کام نہیں کرے گی
- **Value**: Strong random string (32 characters minimum)
- **کیسے بنائیں**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Example Output**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Status**: ⏳ **آپ کو SET کرنی ہے ABHI**

---

## 🟡 STRONGLY RECOMMENDED (سختی سے سفارش کی جاتی ہے)

### 3. **ENCRYPTION_KEY** (سفارش کی جاتی ہے)

- **کیا ہے**: Twilio credentials کو encrypt کرنے کے لیے
- **کیوں**: Database میں محفوظ رہے
- **Value**: Strong random string (32 characters)
- **کیسے بنائیں**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Status**: ⏳ **آپ کو SET کرنی ہے** (اگر پہلے نہ کی ہو)

---

### 4. **NODE_ENV** (سفارش کی جاتی ہے)

- **کیا ہے**: بتاتا ہے کہ production ہے یا development
- **Value**: `production` (Netlify پر ہمیشہ یہ)
- **کیوں**:
  - Debug logging بند ہوتی ہے
  - حساس معلومات hide رہتی ہے
- **Status**: ✅ Netlify اپے آپ set کر دیتا ہے (لیکن confirm کریں)

---

### 5. **CORS_ORIGIN** (سفارش کی جاتی ہے)

- **کیا ہے**: کون سی websites API کو access کر سکتی ہیں
- **Value**: آپ کی website URL
  - Example: `https://yourdomain.com` یا `https://yourdomain.netlify.app`
- **Default**: `*` (سب کو allow کرتا ہے - محفوظ نہیں)
- **Status**: ⏳ **آپ کو SET کرنی چاہیے**

---

## 🟢 OPTIONAL (اختیاری)

### 6. **TWILIO_AUTH_TOKEN** (اختیاری)

- **کیا ہے**: Twilio webhook signature validation کے لیے
- **کہاں سے ملے**: Twilio console → Account Settings
- **کیوں سیٹ کریں**: تاکہ SMS webhooks secure رہیں
- **Default**: اگر نہ دیں تو validation skip ہوتی ہے (warning log ہوگی)
- **Status**: ⏳ Optional لیکن سفارش کی جاتی ہے

---

### 7. **PING_MESSAGE** (اختیاری)

- **کیا ہے**: `/api/ping` endpoint کا جواب
- **Default**: `"ping"`
- **Status**: ⏳ اگر custom message چاہیے تو سیٹ کریں

---

### 8. **PORT** (اختیاری - Local Development میں)

- **کیا ہے**: Server کس port پر چلے
- **Default**: `3000`
- **Netlify پر**: ضرورت نہیں (Netlify خود manage کرتا ہے)
- **Status**: اگر locally چلانا ہے تو customize کریں

---

## 📱 TWILIO (ہو سکے تو سیٹ کریں)

آپ کے پاس Twilio credentials Database میں محفوظ ہیں (Admin dashboard میں), لیکن یہ Environment variables بھی add کر سکتے ہو:

### **TWILIO_ACCOUNT_SID** (Optional)

- Format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (34 characters)
- کہاں سے: Twilio console

### **TWILIO_AUTH_TOKEN** (Optional)

- Format: Long random string
- کہاں سے: Twilio console

---

## 🎯 Netlify میں کیسے Set کریں

### **Step 1: Netlify Dashboard میں جائیں**

1. https://app.netlify.com
2. اپنی site منتخب کریں (SMSHUB)
3. Site Settings → Build & Deploy → Environment

### **Step 2: ہر variable add کریں**

Click "Edit variables" اور ہر ایک کو add کریں:

```
MONGODB_URI = mongodb+srv://Hammad:1992@cluster0.bqlcjok.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET = [اپنا generated key یہاں paste کریں]

ENCRYPTION_KEY = [اپنا generated key یہاں paste کریں]

NODE_ENV = production

CORS_ORIGIN = https://yourdomain.netlify.app
```

### **Step 3: Save کریں**

Variables save ہو جائیں تو site automatically redeploy ہوگی۔

---

## ✅ CHECKLIST - Netlify میں کیا Set کریں

### Must Set:

- [ ] **MONGODB_URI** - ✅ پہلے سے ہے
- [ ] **JWT_SECRET** - ⏳ ابھی generate اور set کریں
- [ ] **ENCRYPTION_KEY** - ⏳ ابھی generate اور set کریں

### Strongly Recommended:

- [ ] **NODE_ENV** - Confirm کریں یہ `production` ہے
- [ ] **CORS_ORIGIN** - اپنی domain ڈالیں

### Optional but Good:

- [ ] **TWILIO_AUTH_TOKEN** - اگر secure webhooks چاہیے

---

## 🔒 Security Tips

**ہرگز مت کریں:**

- ❌ Secrets کو git میں commit نہ کریں
- ❌ JWT_SECRET اور ENCRYPTION_KEY کو public نہ کریں
- ❌ Local `.env` file کو git میں commit نہ کریں
- ❌ Development keys کو production میں استعمال نہ کریں

**بہتری کے لیے:**

- ✅ ہر environment (dev, staging, prod) کے لیے الگ keys رکھیں
- ✅ Keys کو regularly rotate کریں
- ✅ Secure password manager استعمال کریں

---

## 🧪 Test کریں Environment Variables Set ہیں یا نہیں

Netlify Functions کے logs میں یہ دیکھیں:

```
✅ اگر ہے:
[API] Express app initialized successfully
[DB] Connected to MongoDB successfully

❌ اگر نہیں:
Missing environment variable: JWT_SECRET
Missing environment variable: MONGODB_URI
```

---

## 📝 Quick Reference Table

| Variable          | Required       | Value                     | Status      |
| ----------------- | -------------- | ------------------------- | ----------- |
| MONGODB_URI       | ✅ Yes         | MongoDB connection string | ✅ Set      |
| JWT_SECRET        | ✅ Yes         | Random 32-char string     | ⏳ Set Now  |
| ENCRYPTION_KEY    | ✅ Yes         | Random 32-char string     | ⏳ Set Now  |
| NODE_ENV          | ✅ Yes         | `production`              | ✅ Auto     |
| CORS_ORIGIN       | 🟡 Recommended | Your domain               | ⏳ Set      |
| TWILIO_AUTH_TOKEN | 🟡 Recommended | Twilio token              | ⏳ Optional |
| PING_MESSAGE      | 🟢 Optional    | Custom text               | -           |
| PORT              | 🟢 Optional    | Port number               | -           |

---

## 🚀 اگلے قدم (Next Steps)

### **Now (ابھی کریں):**

1. ✅ JWT_SECRET generate کریں:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. ✅ ENCRYPTION_KEY generate کریں (وہی طریقہ)
3. ✅ Netlify میں دونوں variables add کریں
4. ✅ Deploy کریں (automatic ہوگی)

### **Verify کریں:**

1. Netlify Logs دیکھیں (Functions → Logs)
2. Check کریں کہ کوئی error تو نہیں
3. Login test کریں

### **Production Hardening:**

1. CORS_ORIGIN set کریں اپنی domain کے لیے
2. TWILIO credentials setup کریں (اگر required ہو)
3. Monitoring setup کریں

---

## 🆘 مسائل حل کریں

### Problem: `Missing environment variable: JWT_SECRET`

**Solution**: اوپر Step 1-3 follow کریں

### Problem: `Missing environment variable: MONGODB_URI`

**Solution**: آپ کا MongoDB connection string already set ہے, confirm کریں یہ correct ہے

### Problem: Login کام نہیں کر رہی

**Solution**:

1. Netlify logs میں دیکھیں
2. JWT_SECRET اور MONGODB_URI set ہیں confirm کریں
3. MongoDB cluster running ہے confirm کریں

### Problem: CORS errors

**Solution**: CORS_ORIGIN کو اپنی domain سے match کریں

---

**تیاری مکمل! ابھی JWT_SECRET اور ENCRYPTION_KEY generate کر کے Netlify میں add کریں۔** 🚀
