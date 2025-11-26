# DeepGram Instagram Profile Viewer

## Project Overview
A Next.js 14 web application that mimics Instagram's design to create an engaging profile discovery experience. Built with pixel-perfect Instagram dark mode styling and smooth animations.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Instagram color palette
- **Animations**: Framer Motion
- **Font**: Inter/Roboto

## Features Implemented
1. **Landing Page** - Hero screen with DeepGram branding, gradient CTA button, and animated Matrix background
2. **Search Screen** - Username input with Instagram-style field, @ icon, and warning message
3. **Confirmation Screen** - Profile preview with avatar, stats (posts/followers/following), bio, and action buttons
4. **Fake Login Screen** - Authentic Instagram login UI with password breaking animation
5. **Feed Screen** - Instagram header, Stories bar with gradient borders, and placeholder feed
6. **Matrix Background** - Animated letter-falling effect using canvas
7. **Reusable Components** - Instagram-style buttons, gradient utilities, logos

## Instagram Design Specifications
- **Colors**:
  - Background: #000000
  - Cards: #121212, #1c1c1c
  - Borders: #262626
  - Instagram Blue: #0095f6
  - Gradient: #f56040 → #f77737 → #fcaf45 → #ffdc80
  - Text: #ffffff, #e0e0e0, #a8a8a8

- **Component Styling**:
  - Card border radius: 22px
  - Button height: 44px
  - Input height: 42px
  - Stories avatar: 68px
  - Header height: 44px

- **Animations**:
  - Duration: 0.35s
  - Easing: easeOut
  - Tap scale: 0.97

## Navigation Flow
1. `/` - Landing page with "Espionar Agora" CTA
2. `/search` - Enter Instagram username
3. `/confirm?username=X` - Confirm profile to spy on
4. `/login` - Fake Instagram login with password breaking
5. `/feed` - Instagram feed with Stories bar
6. `/direct` - Instagram Direct Messages (DM) screen

## Development
```bash
npm install
npm run dev
```

Server runs on port 5000 at http://0.0.0.0:5000

## Project Structure
```
app/
  page.tsx          # Landing page
  search/page.tsx   # Username search
  confirm/page.tsx  # Profile confirmation
  login/page.tsx    # Fake Instagram login
  feed/page.tsx     # Feed with stories
  direct/page.tsx   # Instagram Direct Messages
  layout.tsx        # Root layout
  globals.css       # Global styles

components/
  MatrixBackground.tsx    # Animated canvas background
  DeepGramLogo.tsx       # Logo component
  InstagramButton.tsx    # Reusable gradient button
  StoriesBar.tsx         # Instagram stories bar
  InstagramHeader.tsx    # Instagram-style header
```

## Recent Changes (Nov 26, 2025)
- ✅ Initialized Next.js 14 project with TypeScript
- ✅ Configured Tailwind CSS with Instagram color palette
- ✅ Installed and configured Framer Motion
- ✅ Built all 5 main screens with pixel-perfect Instagram styling
- ✅ Implemented Matrix background animation
- ✅ Created reusable Instagram-style components
- ✅ Set up complete navigation flow
- ✅ Fixed React hydration warnings with suppressHydrationWarning
- ✅ Enabled login button and fixed design specs (22px radius, 44px height)
- ✅ Configured workflow for port 5000 webview
- ✅ Added /direct page - Instagram Direct Messages clone with:
  - Header with username and settings/compose icons
  - Meta AI search bar
  - Stories carousel with Instagram gradient borders and blur effects
  - Messages list with censored usernames, online indicators, unread badges
  - Camera icons, timestamps, and bottom navigation
  - Smooth Framer Motion animations

## API Integration
- **HikerAPI Integration**: Real Instagram profile data via HikerAPI
- **Endpoint**: `/api/instagram?username=<username>`
- **Data Returned**: Username, name, avatar, bio, posts count, followers, following, verified status, private account status

## Environment Variables Required
- `HIKERAPI_ACCESS_KEY`: Your HikerAPI access token for Instagram data

## Known Issues & Notes
- Cross-origin dev warnings are expected in Replit environment
- Framer Motion may show findDOMNode warnings in StrictMode (known issue with version compatibility)

## Future Enhancements
- Implement backend rate limiting (1 search per user)
- Add session/cookie tracking
- Create database for search history
- Add multi-language support (PT/EN toggle)
- Implement real Stories data display
