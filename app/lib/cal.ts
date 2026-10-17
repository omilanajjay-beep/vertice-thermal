export type CalSlot = { start: string; end?: string; date: string };

export function validTimeZone(value: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}

export function getCalConfig() {
  const apiKey = process.env.CAL_API_KEY;
  const idRaw = process.env.CAL_EVENT_TYPE_ID;
  const eventTypeId = idRaw && /^\d+$/.test(idRaw) ? Number(idRaw) : undefined;
  const eventTypeSlug = process.env.CAL_EVENT_TYPE_SLUG;
  const username = process.env.CAL_USERNAME;
  const teamSlug = process.env.CAL_TEAM_SLUG;
  const organizationSlug = process.env.CAL_ORGANIZATION_SLUG;
  const eventConfigured = Boolean(eventTypeId || (eventTypeSlug && (username || teamSlug)));
  if (!apiKey || !eventConfigured) return null;
  return { apiKey, eventTypeId, eventTypeSlug, username, teamSlug, organizationSlug };
}

export function addEventIdentity(url: URL, config: NonNullable<ReturnType<typeof getCalConfig>>) {
  if (config.eventTypeId) url.searchParams.set('eventTypeId', String(config.eventTypeId));
  else {
    url.searchParams.set('eventTypeSlug', config.eventTypeSlug!);
    if (config.username) url.searchParams.set('username', config.username);
    if (config.teamSlug) url.searchParams.set('teamSlug', config.teamSlug);
  }
  if (config.organizationSlug) url.searchParams.set('organizationSlug', config.organizationSlug);
}

export function bookingEventIdentity(config: NonNullable<ReturnType<typeof getCalConfig>>) {
  if (config.eventTypeId) return { eventTypeId: config.eventTypeId };
  return {
    eventTypeSlug: config.eventTypeSlug,
    ...(config.username ? { username: config.username } : {}),
    ...(config.teamSlug ? { teamSlug: config.teamSlug } : {}),
    ...(config.organizationSlug ? { organizationSlug: config.organizationSlug } : {}),
  };
}

export async function fetchCalSlots(start: string, end: string, timeZone: string) {
  const config = getCalConfig();
  if (!config) throw new Error('CAL_NOT_CONFIGURED');
  const url = new URL('https://api.cal.com/v2/slots');
  addEventIdentity(url, config);
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);
  url.searchParams.set('timeZone', timeZone);
  url.searchParams.set('format', 'range');
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'cal-api-version': '2024-09-04' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('CAL_AVAILABILITY_FAILED');
  const payload = await response.json();
  const dateMap = payload?.data;
  if (!dateMap || typeof dateMap !== 'object') throw new Error('CAL_AVAILABILITY_FAILED');
  const slots: CalSlot[] = [];
  for (const [date, entries] of Object.entries(dateMap)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(entries)) continue;
    for (const entry of entries) {
      const startValue = typeof entry === 'string' ? entry : (entry as { start?: unknown })?.start;
      const endValue = typeof entry === 'object' && entry ? (entry as { end?: unknown }).end : undefined;
      if (typeof startValue !== 'string' || !Number.isFinite(Date.parse(startValue)) || Date.parse(startValue) <= Date.now()) continue;
      slots.push({ start: startValue, ...(typeof endValue === 'string' ? { end: endValue } : {}), date });
    }
  }
  return slots.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
