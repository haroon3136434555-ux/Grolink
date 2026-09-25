# GroLink 1.0 — Real-Backend MVP

This package upgrades the earlier visual demo into a runnable full-stack MVP.

## Included
- Node.js + Express backend
- SQLite database
- Password hashing with bcrypt
- Session-based authentication
- User onboarding/profile data
- Compatibility scoring from goals, habits, interests and preferences
- Discover/match flow
- Real persisted connections
- Persisted 1-to-1 messaging (poll by refresh/navigation in this MVP)
- Experience publishing
- Communities and membership
- Responsive mobile-first GroLink UI

## Run locally
1. Install Node.js 18+.
2. Extract this ZIP.
3. In the project folder run:
   `npm install`
4. Set a strong `SESSION_SECRET` in production.
5. Run:
   `npm start`
6. Open:
   `http://localhost:3000`

The SQLite database is created automatically as `grolink.db`.

## Production work still required
- HTTPS/domain and cloud deployment
- Managed production database
- Email verification and password reset
- OAuth (Google/Apple)
- Real-time WebSocket chat
- Image/avatar uploads and moderation
- Report/block/admin moderation workflows
- Rate limiting, CSRF protection and security headers
- Privacy policy/terms and age/safety controls
- Push notifications
- Automated tests and monitoring
- App Store/Google Play packaging
