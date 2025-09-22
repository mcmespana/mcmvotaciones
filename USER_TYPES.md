# MCM Votaciones - User Types Documentation

## Overview
The MCM Voting System uses two distinct types of users with different purposes and authentication methods:

## 🔐 Admin Users
**Purpose**: Manage the voting system (create rounds, add candidates, view results)

**Authentication**: 
- Email + Password via Supabase Auth
- Stored in `public.users` table
- Role-based permissions (`admin` or `super_admin`)

**Capabilities**:
- ✅ Create and manage voting rounds
- ✅ Add/edit/remove candidates
- ✅ View real-time results and statistics
- ✅ Export voting data
- ✅ User management (super_admin only)

**Access**: `/admin` routes

---

## 🗳️ Voting Users
**Purpose**: Cast votes in active voting rounds

**Authentication**: 
- **NO registration required**
- Anonymous identification via device fingerprint
- Hash-based duplicate prevention

**Device Fingerprint includes**:
- User Agent (browser/OS info)
- Screen resolution
- Timezone
- Language
- Platform
- Round ID
- IP address (when available)

**Capabilities**:
- ✅ View active voting rounds
- ✅ Cast one vote per round per device
- ✅ Anonymous and secure voting
- ❌ Cannot view results
- ❌ Cannot access admin functions

**Access**: Main application (`/`)

---

## 🔒 Security Features

### Admin Security
- JWT-based authentication via Supabase
- Row Level Security (RLS) policies
- Role-based access control
- Session management

### Voting Security
- Device fingerprinting prevents duplicate votes
- No personal data collection
- Local storage marking for UX
- Server-side hash verification
- Anonymous voting ensures privacy

---

## 📊 Data Flow

### Admin User Flow
1. Access `/admin`
2. Login with email/password
3. Create account → Insert into `public.users`
4. Session established via Supabase Auth
5. Access granted based on role

### Voting User Flow
1. Access main page (`/`)
2. View active rounds (no login)
3. Select candidate
4. Generate device hash
5. Submit vote → Insert into `public.votes`
6. Mark as voted locally
7. Prevent future votes for this round

---

## 💾 Database Tables

### Admin-related
- `public.users` - Admin user profiles and roles
- `public.rounds` - Voting rounds (managed by admins)
- `public.candidates` - Candidates (managed by admins)
- `public.vote_history` - Export history (admin access)

### Voting-related
- `public.votes` - Anonymous votes with device hashes
- `device_hash` column ensures one vote per device per round
- No personal data stored

---

## 🚀 Quick Start

### For Administrators
1. Go to `/admin`
2. Register first admin account
3. Login and start creating voting rounds

### For Voters
1. Go to main page
2. Select candidate
3. Vote (no registration needed)
4. See confirmation

This architecture ensures maximum security for admin functions while maintaining complete anonymity and ease of use for voters.