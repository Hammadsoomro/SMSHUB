# SMSHub - Quick Start Guide

Get your SMS management platform up and running in 5 minutes!

## Step 1: Start the Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## Step 2: Create Your Admin Account

1. Click **"Get Started"** on the landing page
2. Fill in your details:
   - Full Name
   - Email
   - Password (min 8 characters)
3. Click **"Create Account"**
4. You're now logged in as an Admin! 🎉

## Step 3: Connect Your Twilio Account

1. Navigate to **Credentials** in the sidebar
2. Go to [Twilio Console](https://console.twilio.com/)
3. Find your **Account SID** and **Auth Token** under Account Settings
4. Paste them in the Credentials page
5. Click **"Connect Twilio Account"**

### How to Find Twilio Credentials

```
1. Visit https://console.twilio.com/
2. Click your account name (top-left)
3. Select "Account Settings"
4. Under "Account SID" and "Auth Token", click the eye icon to reveal
5. Copy and paste them into SMSHub
```

## Step 4: Manage Phone Numbers (Optional for Testing)

1. Go to **Numbers** page
2. View purchased phone numbers
3. Numbers appear here after you buy them from Twilio
4. Assign numbers to team members

## Step 5: Invite a Team Member

1. Navigate to **Team Management**
2. Click **"Invite Team Member"**
3. Fill in their details:
   - Full Name
   - Email
   - Password
4. Click **"Send Invite"**
5. They can now login with their credentials

## Step 6: Team Member Logs In

1. Open an incognito/private window
2. Go to `/login`
3. Enter the team member's email and password
4. Click **"Sign In"**
5. You're now on the **Messages** page
6. Select a contact to start messaging

## Testing Without Twilio (Development)

For testing the UI without Twilio setup:

1. Create an admin account
2. Skip Twilio credentials (or add dummy ones)
3. Create a team member account
4. Team member can access the Messages page
5. Test the UI and navigation

To add test data, you can modify `server/storage.ts` to pre-populate contacts and messages.

## File Structure Guide

### Understanding the App

**Landing Page** (`client/pages/Landing.tsx`)

- Marketing page explaining features
- Sign in / Sign up buttons

**Authentication** (`client/pages/Login.tsx`, `client/pages/Signup.tsx`)

- User login and registration
- JWT token management

**Admin Dashboard** (`client/pages/admin/Dashboard.tsx`)

- Quick overview of stats
- Navigation to other admin features

**Credentials** (`client/pages/admin/Credentials.tsx`)

- Add/view Twilio credentials
- Most important step for setup

**Numbers** (`client/pages/admin/Numbers.tsx`)

- View phone numbers
- Assign to team members
- Manage number settings

**Team Management** (`client/pages/admin/TeamManagement.tsx`)

- Invite new team members
- View team member status
- Remove team members

**Messaging** (`client/pages/Messages.tsx`)

- Team member SMS conversations
- Contact list (left sidebar)
- Chat view (right panel)

## API Testing with cURL

### Create Admin Account

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Save Twilio Credentials

```bash
curl -X POST http://localhost:3000/api/admin/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "authToken": "your_auth_token_here"
  }'
```

### Get Team Members

```bash
curl -X GET http://localhost:3000/api/admin/team \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues & Solutions

### Issue: "Invalid credentials" Error

**Solution**:

- Double-check email and password
- Ensure you created the account first
- Check for typos

### Issue: Can't connect Twilio credentials

**Solution**:

- Verify Account SID format (starts with AC)
- Ensure Auth Token is correct (not just visible in console)
- Check internet connectivity
- Token should be 32 characters

### Issue: Sidebar not showing on mobile

**Solution**:

- Click the hamburger menu (☰) to toggle sidebar
- App is fully responsive

### Issue: Messages page shows no contacts

**Solution**:

- You need Twilio credentials first
- Phone numbers need to be assigned to the user
- Check that the assignment was successful

## Next Steps

### For Development

1. Explore the code structure
2. Modify styles in `client/global.css`
3. Add new admin pages in `client/pages/admin/`
4. Extend API routes in `server/routes/`

### For Deployment

1. Set up environment variables
2. Replace in-memory storage with database
3. Deploy frontend (Netlify/Vercel)
4. Deploy backend (Heroku/Railway/your VPS)
5. Update WebSocket URL for production

### Adding Features

1. Real SMS sending via Twilio API
2. Message scheduling
3. Advanced analytics
4. Webhook support
5. Message templates

## Useful Resources

- [React Router Docs](https://reactrouter.com/)
- [Express.js Guide](https://expressjs.com/)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [Socket.io Documentation](https://socket.io/docs/)
- [TailwindCSS Reference](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Check the main [README.md](README.md) for detailed docs
- Review inline code comments
- Check `AGENTS.md` for architecture notes
- Examine existing components for patterns

---

**Happy Building! 🚀**
