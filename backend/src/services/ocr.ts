import Tesseract from "tesseract.js";
import path from "path";

export type ScreenTimeEntry = {
  appName: string;
  durationMin: number;
  confidence: number;
};

// Patterns like: "Instagram  2h 15m" or "YouTube  45m" or "Safari  1h"
const LINE_PATTERN = /^(.+?)\s{2,}(?:(\d+)h\s*)?(?:(\d+)m)?$/;
const HOUR_ONLY = /^(.+?)\s{2,}(\d+)h$/;
const MIN_ONLY = /^(.+?)\s{2,}(\d+)m$/;

export async function extractScreenTime(
  imagePath: string
): Promise<ScreenTimeEntry[]> {
  const { data } = await Tesseract.recognize(imagePath, "eng", {
    logger: () => {},
  });

  const lines = data.text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: ScreenTimeEntry[] = [];

  for (const line of lines) {
    const entry = parseLine(line, data.confidence / 100);
    if (entry) entries.push(entry);
  }

  return entries;
}

function parseLine(
  line: string,
  ocrConfidence: number
): ScreenTimeEntry | null {
  let match = line.match(LINE_PATTERN);
  if (match) {
    const appName = match[1].trim();
    const hours = parseInt(match[2] ?? "0", 10);
    const minutes = parseInt(match[3] ?? "0", 10);
    const durationMin = hours * 60 + minutes;
    if (durationMin > 0 && appName.length > 1) {
      return { appName, durationMin, confidence: ocrConfidence };
    }
  }

  match = line.match(HOUR_ONLY);
  if (match) {
    return {
      appName: match[1].trim(),
      durationMin: parseInt(match[2], 10) * 60,
      confidence: ocrConfidence,
    };
  }

  match = line.match(MIN_ONLY);
  if (match) {
    return {
      appName: match[1].trim(),
      durationMin: parseInt(match[2], 10),
      confidence: ocrConfidence,
    };
  }

  return null;
}
