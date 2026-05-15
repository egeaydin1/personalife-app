import Tesseract from "tesseract.js";

export type ScreenTimeEntry = {
  appName: string;
  durationMin: number;
  confidence: number;
};

// Strip leading icon / symbol characters — keeps letters, digits, spaces
function cleanAppName(raw: string): string {
  // Remove leading non-letter chars (icons like ©, ®, >, -, @, &, oO etc.)
  return raw
    .replace(/^[^a-zA-ZÀ-ÖØ-öø-ÿğüşıöçĞÜŞİÖÇ]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Parse a time string like "2h 15m", "45m", "1h", "22s", "1h 30m 20s"
// Returns minutes (minimum 1 if any seconds ≥ 10)
function parseTime(raw: string): number | null {
  const h = raw.match(/(\d+)\s*h/i);
  const m = raw.match(/(\d+)\s*m(?!s)/i);
  const s = raw.match(/(\d+)\s*s/i);

  const hours   = h ? parseInt(h[1]) : 0;
  const minutes = m ? parseInt(m[1]) : 0;
  const seconds = s ? parseInt(s[1]) : 0;

  const total = hours * 60 + minutes + Math.round(seconds / 60);
  if (total === 0 && seconds >= 10) return 1;  // e.g. "22s" → 1 min
  return total > 0 ? total : null;
}

// TIME_RE: matches one or more time components at the end of a string
// Must have at least one digit+unit combination
const TIME_RE = /\s+((?:\d+\s*h(?:\s*\d+\s*m)?(?:\s*\d+\s*s)?|\d+\s*m(?:\s*\d+\s*s)?|\d+\s*s))\s*$/i;

function parseLine(line: string, confidence: number): ScreenTimeEntry | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;

  const match = trimmed.match(TIME_RE);
  if (!match) return null;

  const timeStr = match[1];
  const nameRaw = trimmed.slice(0, trimmed.length - match[0].length);

  const name = cleanAppName(nameRaw);
  const dur  = parseTime(timeStr);

  if (!dur || name.length < 2 || name.length > 60) return null;

  // Filter out obvious non-app-name strings
  if (/^(today|daily|total|screen time|all activity|limits|always allowed)/i.test(name)) return null;

  return { appName: name, durationMin: dur, confidence };
}

export async function extractScreenTime(imagePath: string): Promise<ScreenTimeEntry[]> {
  const { data } = await Tesseract.recognize(imagePath, "eng", {
    logger: () => {},
  });

  const conf = (data.confidence ?? 50) / 100;
  const entries: ScreenTimeEntry[] = [];
  const seen = new Set<string>();

  const lines = data.text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const entry = parseLine(line, conf);
    if (!entry) continue;

    const key = entry.appName.toLowerCase();
    if (seen.has(key)) {
      const existing = entries.find(e => e.appName.toLowerCase() === key);
      if (existing && entry.durationMin > existing.durationMin) {
        existing.durationMin = entry.durationMin;
      }
      continue;
    }
    seen.add(key);
    entries.push(entry);
  }

  return entries.sort((a, b) => b.durationMin - a.durationMin);
}
