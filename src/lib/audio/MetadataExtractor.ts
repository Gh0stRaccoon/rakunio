export interface ExtractedMetadata {
  coverUrl?: string;
}

const coverCache = new Map<string, string>();

/**
 * Extracts embedded ID3v2 APIC/PIC album art from an MP3 file URL using pure browser Fetch & DataView.
 * Searches for 'APIC' or 'PIC' frame tags and JPEG (0xFF, 0xD8, 0xFF) or PNG (0x89, 0x50, 0x4E, 0x47) headers directly within ID3 frames.
 */
export async function extractAudioMetadata(audioUrl: string): Promise<ExtractedMetadata> {
  if (coverCache.has(audioUrl)) {
    return { coverUrl: coverCache.get(audioUrl) };
  }

  try {
    // Fetch initial 1.5MB of the MP3 file to cover large ID3 headers & embedded artwork
    const response = await fetch(audioUrl, {
      headers: { Range: 'bytes=0-1572864' }
    });

    if (!response.ok && response.status !== 206) {
      return {};
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verify ID3 magic bytes 'ID3'
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
      return {};
    }

    // Find 'APIC' or 'PIC' frame tag in ID3 buffer (searching up to 300KB)
    let apicIndex = -1;
    const maxHeaderScan = Math.min(bytes.length - 4, 300000);

    for (let i = 0; i < maxHeaderScan; i++) {
      if (
        (bytes[i] === 0x41 && bytes[i+1] === 0x50 && bytes[i+2] === 0x49 && bytes[i+3] === 0x43) || // 'APIC'
        (bytes[i] === 0x50 && bytes[i+1] === 0x49 && bytes[i+2] === 0x43) // 'PIC'
      ) {
        apicIndex = i;
        break;
      }
    }

    // Fallback: If APIC tag is not found by ID, search directly for image magic bytes in the ID3 header!
    let imgStart = -1;
    let mimeType = 'image/jpeg';

    const searchStart = apicIndex !== -1 ? apicIndex : 10;
    const searchLimit = Math.min(bytes.length - 4, searchStart + 500000);

    for (let i = searchStart; i < searchLimit; i++) {
      // JPEG magic bytes: 0xFF, 0xD8, 0xFF
      if (bytes[i] === 0xFF && bytes[i+1] === 0xD8 && bytes[i+2] === 0xFF) {
        imgStart = i;
        mimeType = 'image/jpeg';
        break;
      }
      // PNG magic bytes: 0x89, 0x50, 0x4E, 0x47 ('\x89PNG')
      if (bytes[i] === 0x89 && bytes[i+1] === 0x50 && bytes[i+2] === 0x4E && bytes[i+3] === 0x47) {
        imgStart = i;
        mimeType = 'image/png';
        break;
      }
    }

    if (imgStart !== -1) {
      // Read frame length if APIC tag was found
      let imgEnd = Math.min(bytes.length, imgStart + 500000);
      if (apicIndex !== -1 && apicIndex + 8 < bytes.length) {
        const frameLen = (bytes[apicIndex + 4] << 24) | (bytes[apicIndex + 5] << 16) | (bytes[apicIndex + 6] << 8) | bytes[apicIndex + 7];
        if (frameLen > 0 && apicIndex + 10 + frameLen <= bytes.length) {
          imgEnd = apicIndex + 10 + frameLen;
        }
      }

      const imgBytes = bytes.subarray(imgStart, imgEnd);
      const blob = new Blob([imgBytes], { type: mimeType });
      const coverUrl = URL.createObjectURL(blob);

      coverCache.set(audioUrl, coverUrl);
      return { coverUrl };
    }
  } catch (e) {
    console.warn('ID3 APIC extraction error for:', audioUrl, e);
  }

  return {};
}
