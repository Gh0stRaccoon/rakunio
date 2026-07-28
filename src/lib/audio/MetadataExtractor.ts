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
    // Initial fetch: 256KB to quickly find ID3 header and APIC frame
    let response = await fetch(audioUrl, {
      headers: { Range: 'bytes=0-262143' }
    });

    if (!response.ok && response.status !== 206) {
      return {};
    }

    let buffer = await response.arrayBuffer();
    let bytes = new Uint8Array(buffer);

    // ID3v2 header check: "ID3"
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const versionMajor = bytes[3];
      // Calculate total ID3 tag size (synchsafe uint: 7 bits per byte)
      const tagSize = ((bytes[6]! & 0x7f) << 21) |
                      ((bytes[7]! & 0x7f) << 14) |
                      ((bytes[8]! & 0x7f) << 7)  |
                      (bytes[9]! & 0x7f);
      const totalId3Size = 10 + tagSize;

      let apicIndex = findFrameIndex(bytes, 'APIC');

      // If APIC frame not found in initial 256KB but ID3 tag is larger, fetch up to total ID3 tag size (max 3MB)
      if (apicIndex === -1 && totalId3Size > bytes.length) {
        const fetchLimit = Math.min(totalId3Size, 3 * 1024 * 1024);
        response = await fetch(audioUrl, {
          headers: { Range: `bytes=0-${fetchLimit - 1}` }
        });
        if (response.ok || response.status === 206) {
          buffer = await response.arrayBuffer();
          bytes = new Uint8Array(buffer);
          apicIndex = findFrameIndex(bytes, 'APIC');
        }
      }

      if (apicIndex !== -1) {
        const b4 = bytes[apicIndex + 4] ?? 0;
        const b5 = bytes[apicIndex + 5] ?? 0;
        const b6 = bytes[apicIndex + 6] ?? 0;
        const b7 = bytes[apicIndex + 7] ?? 0;

        // Calculate frame length (ID3v2.3 uses 32-bit uint; ID3v2.4 uses synchsafe 28-bit uint)
        let frameLen: number;
        if (versionMajor === 4) {
          frameLen = ((b4 & 0x7f) << 21) | ((b5 & 0x7f) << 14) | ((b6 & 0x7f) << 7) | (b7 & 0x7f);
        } else {
          frameLen = (b4 << 24) | (b5 << 16) | (b6 << 8) | b7;
        }

        const frameStart = apicIndex + 10;
        const frameEndNeeded = frameStart + frameLen;

        // CRITICAL FIX: If the image frame extends beyond the fetched byte buffer, fetch the full frame!
        if (frameEndNeeded > bytes.length) {
          const fullFetchLimit = Math.min(frameEndNeeded + 1024, 5 * 1024 * 1024);
          const fullResp = await fetch(audioUrl, {
            headers: { Range: `bytes=0-${fullFetchLimit - 1}` }
          });
          if (fullResp.ok || fullResp.status === 206) {
            buffer = await fullResp.arrayBuffer();
            bytes = new Uint8Array(buffer);
          }
        }

        const frameData = bytes.subarray(frameStart, Math.min(frameStart + frameLen, bytes.length));

        // Parse MIME type
        const mimeEnd = findByte(frameData, 0x00, 1);
        let mimeType = new TextDecoder().decode(frameData.subarray(1, mimeEnd)).trim() || 'image/jpeg';
        if (mimeType.toLowerCase() === 'image/jpg') mimeType = 'image/jpeg';

        // Picture type (1 byte)
        let imgStart = mimeEnd + 2;

        // Skip description null-terminated string (encoding aware)
        const encoding = frameData[0] || 0;
        if (encoding === 1 || encoding === 2) {
          // UTF-16 with null terminator (0x00 0x00)
          while (imgStart < frameData.length - 1) {
            if (frameData[imgStart] === 0x00 && frameData[imgStart + 1] === 0x00) {
              imgStart += 2;
              break;
            }
            imgStart++;
          }
        } else {
          // ISO-8859-1 or UTF-8 single null byte
          const descEnd = findByte(frameData, 0x00, imgStart);
          imgStart = descEnd + 1;
        }

        const imgData = frameData.subarray(imgStart);
        if (imgData.length > 0) {
          const blob = new Blob([imgData], { type: mimeType });
          const coverUrl = URL.createObjectURL(blob);

          coverCache.set(audioUrl, coverUrl);
          return { coverUrl };
        }
      }
    }
  } catch (e) {
    console.warn('[MetadataExtractor] Failed to extract album art:', e);
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
