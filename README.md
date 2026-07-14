# Lotto Draw App Deployment

This project is deployed on Vercel as a static site plus a Serverless Function.

## Vercel Project Settings

- Framework Preset: `Other`
- Root Directory: repository root
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: leave empty

The repo also includes `vercel.json` so Vercel can use the function runtime without extra setup.

## Environment Variables

Add these in Vercel Dashboard > Project > Settings > Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE` - optional, default is `lotto_draws`

Apply them to:

- `Production`
- `Preview`
- `Development`

## Deployment Flow

1. Run the SQL in `supabase-schema.sql` in Supabase.
2. Connect the GitHub repository to Vercel.
3. Add the environment variables above.
4. Deploy the project.

## Local Development

You can pull Vercel env vars locally:

```bash
vercel env pull
```

Then run:

```bash
vercel dev
```

## How It Works

- The browser calls `/api/draw`.
- `GET /api/draw` loads the latest draws from Supabase.
- `POST /api/draw` generates a new draw and saves it to Supabase.

## Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Vercel environment variables.
- Do not expose the service role key in client-side code.
