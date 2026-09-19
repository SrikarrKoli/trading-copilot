# Deployment and auth redirects

Use only the Trading Copilot Supabase project `ucemnqmduiwknwgvbfmc`.
Never use Transfer Helper `itpyjvppgoabywqcgaxu`.

## Supabase dashboard clicks (required for password reset)

### 1. Authentication → URL Configuration

Set:

- **Site URL:** `https://trading-copilot-ten.vercel.app`
- **Redirect URLs** (add each; wildcards matter for `?next=`):
  - `https://trading-copilot-ten.vercel.app/auth/callback`
  - `https://trading-copilot-ten.vercel.app/**`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`

Save.

### 2. Authentication → Email Templates → Reset password

Keep the default link that uses `{{ .ConfirmationURL }}` (or equivalent RedirectTo).
Do **not** hard-code Site URL without the redirect target — the app sends

`https://trading-copilot-ten.vercel.app/auth/callback?next=%2Fupdate-password`

and the callback must preserve that `next` value.

### 3. Authentication → Attack Protection

Enable **Leaked password protection** (HaveIBeenPwned). Security advisor warns when this is off.

### 4. Authentication → Providers → Email

Leave Email enabled. Owner account must match `AUTH_OWNER_EMAIL` (production:
`srikarrkolipaka@gmail.com`).

## App behavior (code)

Password recovery flow:

1. `/forgot-password` → `resetPasswordForEmail` with `redirectTo` from `getAuthCallbackUrl("/update-password")` (encoded `next`).
2. `/auth/callback` exchanges the code, **attaches session cookies on the redirect response**, verifies the owner, then routes to `/update-password` when `next` allowlist matches.
3. `/update-password` requires an owner recovery session; without one it shows a recovery-expired panel (not a silent login bounce). Proxy treats `/update-password` as a public path so that panel can render.

Only `/update-password` is accepted as an explicit callback `next` destination.
Auth redirects use `NEXT_PUBLIC_SITE_URL` / `getSiteOrigin()` — never request Host headers.

## Vercel environment

| Variable | Production value / purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ucemnqmduiwknwgvbfmc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key from that project |
| `NEXT_PUBLIC_SITE_URL` | `https://trading-copilot-ten.vercel.app` |
| `AUTH_OWNER_EMAIL` | Permanent owner email, e.g. `srikarrkolipaka@gmail.com` |
| `LOCAL_AUTH_BYPASS` | **`false` in production** |
| `TEMP_AUTH_UNLOCK` | Temporary MVP unlock (`true`/`false`). When `true`, route protection and `hasOwnerAccess` treat the visitor as owner without a session. **Temporary only** — never leave on for real multi-user use; set `false` before real launch. |
| `TRADIER_ENVIRONMENT` | Optional: `production` or `sandbox` |
| `TRADIER_ACCESS_TOKEN` | Optional server-only token; never prefix with `NEXT_PUBLIC_` |

Use Vercel's Next.js preset and Node.js 22 or newer. Redeploy after changing public
environment variables because they are included at build time. Store credentials
in environment settings, never in committed files. Tradier is optional for the
manual MVP workflows.

For local development, copy `.env.example` to `.env.local`, supply the public key
and owner email, and set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Keep the
localhost callback and `http://localhost:3000/**` in the same project's redirect
allowlist. Password recovery requires a real owner session flow; the local UI
bypass does not supply database authorization.

## Temporary auth unlock (MVP only)

`TEMP_AUTH_UNLOCK=true` bypasses session checks for product work when password/login friction blocks iteration. Real auth routes (`/login`, `/forgot-password`, `/update-password`, `/auth/callback`) stay intact. The login page shows a banner when unlock is on.

- Set on Vercel only while building the single-owner MVP.
- Set `TEMP_AUTH_UNLOCK=false` (or remove) before any real multi-user launch.
- This does **not** replace Supabase auth; it is a reversible gate for route protection.

## Post-deploy smoke

1. Owner sign-in / sign-out.
2. Forgot password → inbox → `/auth/callback?code=…&next=…` → `/update-password` → save → sign in with new password.
3. Confirm an expired/reused link shows the recovery-expired panel, not an unexplained login loop.

Passing a local build does not verify mailbox or dashboard allowlists.
