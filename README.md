# SACH36VN Match Betting Dashboard

A React + Vite dashboard for monitoring CSGOEmpire/Betby match betting data.

## Why the API is server-side now

The old Discord bot could call Betby directly because it ran in Node.js. The web app runs in a browser, so direct requests hit CORS/unsafe-header restrictions and can be blocked by CloudFront.

The dashboard now calls a Supabase Edge Function:

```text
Browser -> Supabase Edge Function -> Betby API
```

This mirrors the working Discord bot environment.

## Frontend env

Create/update `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For local function development, you can optionally bypass `supabase.functions.invoke` with:

```env
VITE_MATCHBETTING_FUNCTION_URL=http://localhost:54321/functions/v1/matchbetting
```

## Run frontend

```powershell
npm run dev
```

## Deploy function

```powershell
supabase functions deploy matchbetting
```

If running locally with Supabase CLI:

```powershell
supabase functions serve matchbetting --env-file .env
```
