# Deployment and auth redirects

Use only the Trading Copilot Supabase project `ucemnqmduiwknwgvbfmc`.
Never use Transfer Helper `itpyjvppgoabywqcgaxu`.

In Supabase **Authentication → URL Configuration**, set:

- **Site URL:** `https://trading-copilot-ten.vercel.app`
- **Redirect URLs:** MUST include both `https://trading-copilot-ten.vercel.app/auth/callback`
  and `http://localhost:3000/auth/callback` (development).

The existing [callback route](../src/app/auth/callback/route.ts) exchanges the auth
code, verifies the owner, and routes password recovery to `/update-password`.
The reset action sends `/auth/callback?next=/update-password`; other callback
visits use the existing onboarding/overview start path. Only `/update-password`
is accepted as an explicit `next` destination.

## Vercel environment

| Variable | Production value / purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ucemnqmduiwknwgvbfmc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key from that project |
| `NEXT_PUBLIC_SITE_URL` | `https://trading-copilot-ten.vercel.app` |
| `AUTH_OWNER_EMAIL` | Permanent owner email, e.g. `srikarrkolipaka@gmail.com` |
| `LOCAL_AUTH_BYPASS` | **`false` in production** |
| `TRADIER_ENVIRONMENT` | Optional: `production` or `sandbox` |
| `TRADIER_ACCESS_TOKEN` | Optional server-only token; never prefix with `NEXT_PUBLIC_` |

Use Vercel's Next.js preset and Node.js 22 or newer. Redeploy after changing public
environment variables because they are included at build time. Store credentials
in environment settings, never in committed files. Tradier is optional for the
manual MVP workflows.

For local development, copy `.env.example` to `.env.local`, supply the public key
and owner email, and set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Keep the
localhost callback in the same project's redirect allowlist. Password recovery
requires a real owner session flow; the local UI bypass does not supply database
authorization.

After deployment, verify owner sign-in, sign-out, and a password reset link back
through `/auth/callback` to `/update-password`. These checks require the configured
Supabase project and owner mailbox; passing a local build does not verify them.
