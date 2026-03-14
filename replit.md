# AI Ghost - Instagram Spy/Observer Platform

## Project Overview
A Next.js 14 Instagram spy/observer product called "AI Ghost" with persuasive pitch pages (/pitch, /pitch1), simulated Instagram-like pages (/feed, /direct, /chat1, /chat2, /chat3), a real profile viewer (/perfil), and a ghost-themed funnel with dark purple/gradient identity across all onboarding pages. Pages are in English. Payments via centerpag.com.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Database**: Neon PostgreSQL (raw SQL via `pg` Pool)
- **Payments**: CenterPag checkout links

## Key Features
1. **Dashboard** (`/dashboard`) - Central hub with services, credits, XP system
2. **Camera** (`/camera`) - Device camera media recovery (photos/videos)
3. **WhatsApp Monitor** (`/whatsapp`) - WhatsApp conversation monitoring
4. **SMS Monitor** (`/sms`, `/investigator`) - SMS message interception
5. **Detective** (`/detetive`) - Private detective investigation service
6. **Location** (`/location`) - Real-time GPS tracking
7. **Calls** (`/calls`) - Call log monitoring
8. **Other Networks** (`/outros`) - Facebook, TikTok, Telegram monitoring
9. **Credits System** - Buy/spend credits to unlock services
10. **Support Chat** - AI support chatbot widget on all service pages

## Support Chat Widget
- **Component**: `components/SupportChat.tsx`
- **API**: `app/api/support/route.ts`
- **Database table**: `support_interactions` (email, interaction_type, tool_name, created_at)
- **Features**:
  - Floating button (bottom-right) on dashboard, profile, and all service pages
  - Three main flows: Buy Credits, Tool Not Working, Request Refund
  - Instagram tool → maintenance message + Camera Spy redirect
  - Location tool → checking + no errors found + email contact
  - Other tools → 30-sec loading + critical error + 8-day resolution + 10K free credits promise
  - Refund flow → unsatisfied → 60-sec loading + success + 8-day refund promise
  - Tracks interactions per user email in database
  - Returns remaining days (8 - days since interaction) for repeat visits
  - Chat persists state during session

## Project Structure
```
app/
  page.tsx              # Landing page
  dashboard/page.tsx    # Main hub
  profile/page.tsx      # User profile/stats
  cadastro/page.tsx     # Registration/login
  camera/page.tsx       # Camera media recovery
  whatsapp/page.tsx     # WhatsApp monitor
  sms/page.tsx          # SMS monitor (English)
  investigator/page.tsx # SMS monitor (uses sms.* translation keys)
  detetive/page.tsx     # Detective service
  location/page.tsx     # GPS tracking
  calls/page.tsx        # Call logs
  outros/page.tsx       # Other networks
  buy/page.tsx          # Credits purchase
  pitch/page.tsx        # Sales landing
  perfil/page.tsx       # Instagram-style profile page (fetches real data via API)
  api/
    credits/            # Credits GET/POST
    support/            # Support interactions GET/POST
    webhook/perfectpay/ # Payment webhooks

components/
  SupportChat.tsx       # Support chat widget
  ClientProviders.tsx   # Client-side providers
  PurchaseNotification.tsx

lib/
  useTranslation.ts     # Translation system (all English strings under 'pt' key)
  checkoutLinks.ts      # CenterPag checkout URLs
  credits.ts            # Credit utilities
```

## Translation System
- `lib/useTranslation.ts` contains all UI strings in English
- Keys are organized by page: `dash.*`, `auth.*`, `camera.*`, `sms.*`, `whatsapp.*`, `det.*`, `common.*`
- Language is hardcoded to 'pt' (key name) but all values are in English

## Real-Time Visitor Monitor
- **Route**: `/useronline` (password-protected: `admin2024obs`)
- **Tracker Component**: `components/VisitorTracker.tsx` (added to layout.tsx)
- **API**: `app/api/tracking/route.ts` (POST for tracking, GET for admin data)
- **Database table**: `visitor_tracking`
- **Features**:
  - Real-time visitor tracking across all pages
  - Visitor IDs based on Brasília time (DD/MM-H:MM format)
  - Auto-replaces ID with real name after registration
  - Color-coded status: green (online), red (left early), yellow (left advanced)
  - Funnel visualization bar chart
  - Page-by-page breakdown with expandable visitor lists
  - Device, browser, referrer detection
  - 24h active / 7-day history lifecycle
  - Auto-polls every 5 seconds, heartbeat every 30 seconds

## Database Tables
- `user_credits` - email, name, total_credits, used_credits, unlocked_all
- `user_utms` - UTM tracking per user
- `webhook_logs` - Payment webhook event logs
- `support_interactions` - Support chat interaction tracking
- `visitor_tracking` - Real-time visitor tracking (id, visitor_id, session_id, display_name, current_page, entry_page, page_history, is_online, device, browser, referrer, timestamps)

## Environment Variables
- `DATABASE_URL`: Neon PostgreSQL connection string
- `HIKERAPI_ACCESS_KEY`: HikerAPI token
- `GOOGLE_GEOLOCATION_API_KEY`: Google Geolocation API key
- `ADMIN_PASSWORD`: Admin panel password

## UTM Tracking
- 4 UTM pixels loaded via `app/layout.tsx`
- UTM params preserved across pages via `appendUtmToPath()` / `appendUtmToLink()`

## Payment Links
- All checkout links use CenterPag: `https://go.centerpag.com/PPU38CQ*`
- Links managed in `lib/checkoutLinks.ts` and inline in pages

## Development
```bash
npm run dev  # Runs on port 5000
```
