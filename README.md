# SMSHub - Complete SMS Management Platform

A production-ready full-stack SMS management application built with React, Express, TypeScript, and Twilio integration. Manage team members, handle real-time SMS conversations, and track messaging insights all from one platform.

## Features

✨ **Core Features**

- 🔐 JWT Authentication with role-based access control (Admin & Team Member)
- 📱 Real-time SMS messaging with Socket.io
- 👥 Team management with member invitations
- 📞 Twilio integration for SMS operations
- 💬 SMS conversation history and contact management
- 📊 Admin dashboard with insights (extensible)
- 🔒 Secure credential storage
- 📲 Phone number management and assignment

## Architecture

### Tech Stack

- **Frontend**: React 18 + React Router 6 (SPA) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express + Node.js
- **Real-time**: Socket.io
- **Authentication**: JWT with SHA-256
- **Storage**: In-memory (MVP - easily swappable with PostgreSQL, MongoDB, etc.)
- **UI**: Radix UI + Lucide React icons

### Project Structure

```
client/                          # React Frontend
├── pages/
│   ├── Landing.tsx              # Landing page
│   ├── Login.tsx                # Login page
│   ├── Signup.tsx               # Signup page
│   ├── Messages.tsx             # Team member - SMS conversations
│   ├── admin/
│   │   ├── Dashboard.tsx        # Admin dashboard
│   │   ├── Credentials.tsx      # Twilio credentials management
│   │   ├── Numbers.tsx          # Phone numbers management
│   │   ├── TeamManagement.tsx   # Team member management
│   │   ├── AccountInfo.tsx      # Account information
│   │   └── Insights.tsx         # Messaging insights (extensible)
│   └── NotFound.tsx             # 404 page
├── components/
│   ├── AdminLayout.tsx          # Reusable admin sidebar layout
│   └── ui/                      # Pre-built UI components
├── lib/
│   ├── socket.ts                # Socket.io client utilities
│   └── utils.ts                 # Utility functions
└── global.css                   # Global styles & theme

server/                          # Express Backend
├── index.ts                     # Main server setup
├── storage.ts                   # In-memory database
├── jwt.ts                       # JWT utilities
├── twilio.ts                    # Twilio API integration
├── socket.ts                    # Socket.io setup
├── middleware/
│   └── auth.ts                  # Authentication middleware
└── routes/
    ├── auth.ts                  # Auth endpoints (signup, login)
    ├── admin.ts                 # Admin endpoints
    └── messages.ts              # Messages endpoints

shared/
├── api.ts                       # Shared TypeScript interfaces

```

## Getting Started

### Prerequisites

- Node.js 16+
- PNPM (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000 in your browser
```

### Development

```bash
# Type checking
pnpm typecheck

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test
```

## Usage Guide

### 1. Sign Up (Admin Account)

- Navigate to `/signup`
- Fill in your details
- You automatically become an Admin
- You're redirected to the Admin Dashboard

### 2. Connect Twilio Credentials

- Go to **Credentials** page
- Add your Twilio Account SID and Auth Token
- [How to find your Twilio credentials](https://www.twilio.com/console/account/settings)
- Credentials are securely stored and encrypted

### 3. Manage Phone Numbers

- Navigate to **Numbers** page
- View purchased numbers
- Assign numbers to team members

### 4. Manage Team Members

- Go to **Team Management** page
- Click "Invite Team Member"
- Fill in their details
- They can now login as team members
- Assign phone numbers to them

### 5. Team Members - Send/Receive SMS

- Team members login with their credentials
- They see the **Messages** page
- Contact list on the left, conversation on the right
- Select a contact to view chat history
- Send messages in real-time
- Only see conversations for assigned numbers

## API Endpoints

### Auth Routes

```
POST   /api/auth/signup          - Create admin account
POST   /api/auth/login           - Login user
```

### Admin Routes (Requires Admin Role)

```
POST   /api/admin/credentials    - Save Twilio credentials
GET    /api/admin/credentials    - Get saved credentials
GET    /api/admin/numbers        - List phone numbers
GET    /api/admin/team           - List team members
POST   /api/admin/team/invite    - Invite team member
DELETE /api/admin/team/:memberId - Remove team member
```

### Messages Routes (Authenticated)

```
GET    /api/messages/contacts           - Get all contacts
GET    /api/messages/conversation/:id   - Get conversation history
POST   /api/messages/send               - Send SMS message
```

## Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "abc123",
  "email": "user@example.com",
  "role": "admin" | "team_member",
  "iat": 1234567890,
  "exp": 1234671490
}
```

### Role-Based Access

- **Admin**: Full access to dashboard, credentials, numbers, team management
- **Team Member**: Access only to assigned phone numbers and conversations

## Real-time Features (Socket.io)

### Socket Events

```javascript
// Client to Server
socket.emit("message_sent", { phoneNumberId, to, body });
socket.emit("incoming_sms", { phoneNumberId, from, body });

// Server to Client
socket.on("new_message", (data) => {
  /* ... */
});
socket.on("incoming_sms_notification", (data) => {
  /* ... */
});
socket.on("message_updated", (data) => {
  /* ... */
});
```

### Auto-subscribed Rooms

- `user:${userId}` - Personal messages
- `admin:${adminId}` - Admin notifications

## Data Models

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "team_member";
  adminId?: string; // For team members
  createdAt: string;
}
```

### TwilioCredentials

```typescript
interface TwilioCredentials {
  id: string;
  adminId: string;
  accountSid: string;
  authToken: string;
  connectedAt: string;
}
```

### PhoneNumber

```typescript
interface PhoneNumber {
  id: string;
  adminId: string;
  phoneNumber: string;
  assignedTo?: string; // team member id
  purchasedAt: string;
  active: boolean;
}
```

### Message

```typescript
interface Message {
  id: string;
  phoneNumberId: string;
  from: string;
  to: string;
  body: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  sid?: string; // Twilio SID
}
```

## Design System

### Color Scheme

- **Primary**: Blue (#4D5FFF)
- **Secondary**: Purple (#A145FF)
- **Accent**: Cyan (#4DCFFF)
- **Background**: White/Dark backgrounds
- **Sidebar**: Light gray with blue accent

### Typography

- Font Family: Inter
- Headings: Bold with 47.4% lightness
- Body: Regular with 16.3% lightness

## Database Migration Guide

The app currently uses in-memory storage. To migrate to a database:

### Option 1: PostgreSQL with Prisma

```bash
npm install @prisma/client
npm install -D prisma
```

### Option 2: MongoDB

```bash
npm install mongoose
```

### Option 3: Supabase

Connect via the MCP integration in Builder.io

Update `server/storage.ts` to use your database client instead of Map.

## Deployment

### Netlify

1. Connect via Builder.io MCP
2. Auto-deploys on git push

### Vercel

1. Connect via Builder.io MCP
2. Configure environment variables

### Self-hosted

```bash
npm run build
npm start
```

## Environment Variables

```
# Server
JWT_SECRET=your-secret-key-change-in-production
PORT=3000

# Twilio (optional, can be managed per-admin)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token

# Database (if using external DB)
DATABASE_URL=...
```

## Security Considerations

✅ **Implemented**

- JWT authentication with expiration
- Password hashing with SHA-256
- Role-based access control
- Credential encryption for Twilio details
- CORS enabled

⚠️ **For Production**

- Use bcrypt instead of SHA-256 for password hashing
- Implement rate limiting on auth endpoints
- Add HTTPS only in production
- Store JWT_SECRET securely in environment
- Add request validation with Zod
- Implement audit logging
- Add 2FA for admin accounts
- Use HTTPS for WebSocket connections

## Future Enhancements

📋 **Planned Features**

- [ ] Message scheduling
- [ ] Group messaging
- [ ] Advanced analytics and reporting
- [ ] Webhook integration
- [ ] Message templates
- [ ] Bulk SMS sending
- [ ] Two-factor authentication
- [ ] API keys for integrations
- [ ] Message encryption
- [ ] Call recording/transcription

## Troubleshooting

### "Invalid credentials" on login

- Check email and password are correct
- Ensure user exists in the system

### Messages not sending

- Verify Twilio credentials are correct
- Check internet connectivity
- Ensure phone number is assigned

### Socket.io not connecting

- Check WebSocket is enabled
- Verify authentication token is valid
- Check browser console for errors

## Support & Contributing

- 📚 Documentation: Review inline comments in code
- 🐛 Issues: Check GitHub issues
- 💡 Ideas: Open a discussion

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ using React, Express, and Twilio**
