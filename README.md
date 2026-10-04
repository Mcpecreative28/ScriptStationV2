# ScriptStationV2

Modern, mobile-first developer resource hub inspired by the supplied specification. UI is functional as a frontend demo and is structured for Firebase/Firestore integration.

## Run

```bash
npm install
npm run dev
```

## Firebase
1. Create/use Firebase project `scriptstation-v2`.
2. Enable Google provider in Authentication.
3. Create Firestore.
4. Put web config in `.env.local` using `.env.example`.
5. Deploy `firestore.rules`.
6. Enable App Check in production.
7. Set admin custom claim `admin=true` from a trusted server/Admin SDK. Never rely on frontend email checks.

## ImgBB
The ImgBB key is intentionally not used by the frontend. Implement upload through a trusted serverless function/proxy with `IMGBB_API_KEY` in server-side environment variables.

## Production hardening
Add server-side rate limiting, abuse detection, security headers/CSP, sanitized rich text, URL allowlisting, transactional download/rating counters, audit logs, purchase/payment provider abstraction, and isolated code execution before enabling untrusted execution.

## Routes
`/`, `/login`, `/scripts`, `/scripts/upload`, `/scripts/:id`, `/snippets`, `/baileys`, `/rooms`, `/marketplace`, `/dashboard`, `/admin`, `/search`.
