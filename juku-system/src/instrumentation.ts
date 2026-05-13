// Next.js instrumentation hook.
// Server runtime sets TZ to Asia/Tokyo so that all Date-related work
// (toLocaleString without timeZone, setHours, etc.) is JST-based.
// Required because Vercel reserves the TZ environment variable, so we
// cannot configure it through the dashboard.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Asia/Tokyo";
  }
}
