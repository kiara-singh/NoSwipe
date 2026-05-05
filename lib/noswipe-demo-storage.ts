/** localStorage keys for demo-only client state; always scope by Supabase user id. */

export function dailyPassesStorageKey(userId: string) {
  return `noswipe_daily_passes:${userId}`;
}

export function upcomingDatesStorageKey(userId: string) {
  return `noswipe_upcoming_dates:${userId}`;
}
