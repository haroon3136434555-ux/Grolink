# GroLink production checklist

## Ready in this package
- Docker deployment
- Railway configuration
- Health check at `/api/health`
- Production session cookie settings
- Password hashing
- Server-side matching
- Persistent relational data model

## Required before public launch
1. Connect a managed persistent database (PostgreSQL recommended).
2. Set a strong `SESSION_SECRET`.
3. Add HTTPS/custom domain.
4. Add email verification and password reset.
5. Add Google/Apple sign-in if desired.
6. Add avatar/image storage and content moderation.
7. Add report/block/admin moderation endpoints and dashboard.
8. Add rate limiting, CSRF protection and security headers.
9. Add real-time WebSocket/SSE messaging and push notifications.
10. Add age/safety controls, Terms, Privacy Policy and community guidelines.
11. Run automated tests, security review and backup/restore tests.
12. Package the web app as Android/iOS after production QA.

## Deployment blocker
Railway's GitHub deployment connector requires an existing GitHub repository in `owner/name` form. This chat currently has no GitHub repository creation/push connector, so the code is prepared but cannot honestly be claimed as publicly deployed yet.
