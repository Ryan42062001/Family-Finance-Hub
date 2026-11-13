// FFH-P04: lets the automated isolation check confirm which commit and environment an address serves before it signs
// in. Build metadata only (Vercel's commit SHA and environment); no user, household or secret data. Fixed at build time.
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    environment: process.env.VERCEL_ENV ?? null,
  });
}
