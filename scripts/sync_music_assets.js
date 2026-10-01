import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function processDirectory(dirPath, durations) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath, durations);
    } else if (entry.isFile() && entry.name.endsWith('.mp3')) {
      const baseName = entry.name.replace(/\.mp3$/i, '');
      const trackId = slugify(baseName);
      const webpCoverPath = path.join(dirPath, `${baseName}.webp`);

      // 1. Extract and optimize embedded cover art if available and not yet created
      if (!fs.existsSync(webpCoverPath)) {
        try {
          // Check if mp3 has video stream (attached picture)
          const probe = execSync(
            `ffprobe -i "${fullPath}" -show_streams -select_streams v -v quiet -of json`,
            { encoding: 'utf8' }
          );
          const probeData = JSON.parse(probe);
          if (probeData.streams && probeData.streams.length > 0) {
            execSync(
              `ffmpeg -i "${fullPath}" -an -vframes 1 -vf "scale='min(512,iw)':-1" -q:v 85 "${webpCoverPath}" -y`,
              { stdio: 'ignore' }
            );
            console.log(`Extracted cover for ${entry.name} -> ${webpCoverPath}`);
          }
        } catch (err) {
          console.warn(`Could not extract cover for ${entry.name}:`, err.message);
        }
      }

      // 2. Read duration in seconds
      try {
        const durStr = execSync(
          `ffprobe -i "${fullPath}" -show_entries format=duration -v quiet -of csv="p=0"`,
          { encoding: 'utf8' }
        ).trim();
        const durationSec = Math.round(parseFloat(durStr));
        if (!isNaN(durationSec)) {
          durations[trackId] = durationSec;
        }
      } catch (err) {
        console.warn(`Could not read duration for ${entry.name}:`, err.message);
      }
    }
  }
}

const musicDir = path.resolve('public/music');
const durations = {};

console.log('Scanning music assets in:', musicDir);
processDirectory(musicDir, durations);

const durationsFile = path.resolve('src/data/durations.json');
fs.writeFileSync(durationsFile, JSON.stringify(durations, null, 2) + '\n');
console.log(`Updated ${durationsFile} with ${Object.keys(durations).length} tracks.`);
