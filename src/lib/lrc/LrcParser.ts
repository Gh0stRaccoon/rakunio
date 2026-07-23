export interface LrcLine {
  time: number; // Seconds
  text: string;
}

export function parseLrc(lrcText: string): LrcLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split('\n');
  const result: LrcLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.|\:)(\d{2,3})\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    timeRegex.lastIndex = 0;
    const matches = Array.from(line.matchAll(timeRegex));

    if (matches.length > 0) {
      // Remove all timestamp tags to get plain lyric text
      const lyricText = line.replace(timeRegex, '').trim();

      for (const match of matches) {
        const minStr = match[1];
        const secStr = match[2];
        const fractionStr = match[3];

        if (minStr !== undefined && secStr !== undefined && fractionStr !== undefined) {
          const minutes = parseInt(minStr, 10);
          const seconds = parseInt(secStr, 10);
          const fraction = parseInt(fractionStr, 10);
          const fractionDivisor = fractionStr.length === 3 ? 1000 : 100;

          const timeInSeconds = minutes * 60 + seconds + fraction / fractionDivisor;
          result.push({
            time: timeInSeconds,
            text: lyricText
          });
        }
      }
    }
  }

  // Sort strictly by timestamp ascending
  return result.sort((a, b) => a.time - b.time);
}

export function getActiveLineIndex(lines: LrcLine[], currentTime: number): number {
  if (!lines || lines.length === 0) return -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && currentTime >= line.time) {
      return i;
    }
  }

  return 0;
}
