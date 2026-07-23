export interface ExtractedMetadata {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  coverUrl?: string | undefined;
}

const coverCache = new Map<string, string>();

export async function extractAudioMetadata(audioUrl: string): Promise<ExtractedMetadata> {
  if (coverCache.has(audioUrl)) {
    return { coverUrl: coverCache.get(audioUrl) };
  }

  try {
    // Fetch first 128KB to parse ID3 tags
    const response = await fetch(audioUrl, {
      headers: { Range: 'bytes=0-131072' }
    });

    if (!response.ok && response.status !== 206) {
      return {};
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // ID3v2 header check: "ID3"
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      // Find APIC / PIC frame
      const apicIndex = findFrameIndex(bytes, 'APIC');
      if (apicIndex !== -1) {
        const b4 = bytes[apicIndex + 4] ?? 0;
        const b5 = bytes[apicIndex + 5] ?? 0;
        const b6 = bytes[apicIndex + 6] ?? 0;
        const b7 = bytes[apicIndex + 7] ?? 0;
        const frameLen = (b4 << 24) | (b5 << 16) | (b6 << 8) | b7;
        const frameStart = apicIndex + 10;
        const frameData = bytes.subarray(frameStart, frameStart + frameLen);

        const mimeEnd = findByte(frameData, 0x00, 1);
        const mimeType = new TextDecoder().decode(frameData.subarray(1, mimeEnd)) || 'image/jpeg';
        
        let imgStart = mimeEnd + 2;
        // Skip description null-terminated string
        const descEnd = findByte(frameData, 0x00, imgStart);
        imgStart = descEnd + 1;

        const imgData = frameData.subarray(imgStart);
        const blob = new Blob([imgData], { type: mimeType });
        const coverUrl = URL.createObjectURL(blob);

        coverCache.set(audioUrl, coverUrl);
        return { coverUrl };
      }
    }
  } catch (e) {
    // Return empty fallback on parse error
  }

  return {};
}

function findFrameIndex(bytes: Uint8Array, frameId: string): number {
  const f0 = frameId.charCodeAt(0);
  const f1 = frameId.charCodeAt(1);
  const f2 = frameId.charCodeAt(2);
  const f3 = frameId.charCodeAt(3);

  for (let i = 0; i < bytes.length - 10; i++) {
    if (bytes[i] === f0 && bytes[i + 1] === f1 && bytes[i + 2] === f2 && bytes[i + 3] === f3) {
      return i;
    }
  }
  return -1;
}

function findByte(bytes: Uint8Array, byteValue: number, start: number): number {
  for (let i = start; i < bytes.length; i++) {
    if (bytes[i] === byteValue) return i;
  }
  return bytes.length;
}
