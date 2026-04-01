export function computeExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 30);
  return d;
}

export async function purgeExpired(): Promise<void> {
  // Lazy import to avoid circular init issues
  const { supabase } = await import('./supabase');
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('annotations')
    .delete()
    .lt('expires_at', now);
  if (error) {
    console.error('purgeExpired failed:', error.message);
  }
}
