import type { Track, Album, ExternalLinks } from '../types/track';
import { withBase } from '../utils/base';

export const ARTIST_PROFILES: ExternalLinks = {
  spotify: 'https://open.spotify.com/intl-es/artist/1iuT58XabDSD4c1cDDZsaW',
  youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ',
  apple: 'https://music.apple.com/cl/artist/rakun-io/1870534850'
};

const TRACK_PLATFORM_LINKS: Record<string, ExternalLinks> = {
  'motivo-y-condena': {
    spotify: 'https://open.spotify.com/track/7zi5if7qc9xnaVbYeYRLE0',
    apple: 'https://music.apple.com/cl/song/motivo-y-condena/1873186554',
    youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ'
  },
  'kittyna': {
    spotify: 'https://open.spotify.com/album/2fnooaIiZaqxEA1XUHTbcI',
    apple: 'https://music.apple.com/cl/artist/rakun-io/1870534850',
    youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ'
  },
  'onegai': {
    spotify: 'https://open.spotify.com/album/0pqjKu6RAk3Gam2XGcY0ux',
    apple: 'https://music.apple.com/cl/artist/rakun-io/1870534850',
    youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ'
  },
  'gimme-that': {
    spotify: 'https://open.spotify.com/album/0Ru9mcsa3OBhGrsfLyWhQf',
    apple: 'https://music.apple.com/cl/song/gimme-that/1870534851',
    youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ'
  },
  'luna-llena': {
    spotify: 'https://open.spotify.com/album/2Xobuh7uUcz6zNhVi5dKRY',
    apple: 'https://music.apple.com/cl/artist/rakun-io/1870534850',
    youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ'
  },
  'doble-tap': {
    spotify: 'https://open.spotify.com/album/3DvhbracR3K5nBnod2AJ5h',
    apple: 'https://music.apple.com/cl/artist/rakun-io/1870534850',
    youtube: 'https://music.youtube.com/channel/UCNEN0Jm9Y3TyY7d30AhX2yQ'
  },
  'destello': {
    spotify: ARTIST_PROFILES.spotify,
    apple: 'https://music.apple.com/cl/song/destello/1873186555',
    youtube: ARTIST_PROFILES.youtube
  },
  'modo-avion': {
    spotify: ARTIST_PROFILES.spotify,
    apple: 'https://music.apple.com/cl/song/modo-avi%C3%B3n/1873186547',
    youtube: ARTIST_PROFILES.youtube
  },
  'me-aleje-de-ti': {
    spotify: ARTIST_PROFILES.spotify,
    apple: 'https://music.apple.com/cl/song/me-alej%C3%A9-de-ti/1873186559',
    youtube: ARTIST_PROFILES.youtube
  },
  'me-duele': {
    spotify: ARTIST_PROFILES.spotify,
    apple: ARTIST_PROFILES.apple,
    youtube: ARTIST_PROFILES.youtube
  },
  'espiral': {
    spotify: 'https://open.spotify.com/album/1gSqeI6tfsfqvT8j64LYXC',
    apple: 'https://music.apple.com/cl/album/espiral/1873186268',
    youtube: ARTIST_PROFILES.youtube
  }
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function scanMusicGlob(): { tracks: Track[]; albums: Album[] } {
  // Vite's eager glob scanner dynamically discovers all MP3, LRC, & cover image files inside /public/music/
  const mp3Modules = import.meta.glob('/public/music/**/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
  const lrcModules = import.meta.glob('/public/music/**/*.lrc', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const imageModules = import.meta.glob('/public/music/**/*.{jpg,jpeg,png,webp,svg}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

  const tracks: Track[] = [];
  const albumsMap = new Map<string, Album>();

  for (const rawPath in mp3Modules) {
    const rawUrl = mp3Modules[rawPath];
    if (!rawUrl) continue;
    
    // Extract folder name and track title from rawPath (e.g., "/public/music/rakunio/Me duele.mp3")
    const parts = rawPath.split('/');
    const filename = parts.pop() || '';
    const folder = parts.pop() || 'coleccion';

    const titleWithoutExt = filename.replace(/\.mp3$/i, '');
    const trackId = slugify(titleWithoutExt);
    const albumId = slugify(folder);

    // Playlist/Album name matches the exact folder name
    const albumTitle = folder;
    const artistName = folder === 'rakunio' ? 'Rakun.io' : 'Lofi Producer';

    // Find folder cover image if available (e.g., /public/music/rakunio/cover.jpg or cover.png)
    const folderPath = parts.join('/');
    let folderCover = withBase('/favicon.svg');
    for (const imgPath in imageModules) {
      if (imgPath.startsWith(folderPath + '/')) {
        const imgUrl = imageModules[imgPath];
        if (imgUrl) {
          folderCover = withBase(imgUrl.replace(/^\/(rakunio\/)+/, '/'));
          break;
        }
      }
    }

    // Find matching LRC content
    const lrcPath = rawPath.replace(/\.mp3$/i, '.lrc');
    const lrcContent = lrcModules[lrcPath] || undefined;

    // Clean audio URL path
    const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    const audioUrl = withBase(cleanPath.replace(/^\/(rakunio\/)+/, '/'));

    // Attach external streaming links if available or fallback to artist profiles
    const externalLinks: ExternalLinks = TRACK_PLATFORM_LINKS[trackId] || { ...ARTIST_PROFILES };

    const trackObj: Track = {
      id: trackId,
      title: titleWithoutExt,
      artist: artistName,
      album: albumTitle,
      albumId,
      cover: folderCover,
      audioUrl,
      duration: 150,
      externalLinks,
      ...(lrcContent ? { lrcContent } : {})
    };

    tracks.push(trackObj);

    if (!albumsMap.has(albumId)) {
      albumsMap.set(albumId, {
        id: albumId,
        title: albumTitle,
        artist: artistName,
        cover: folderCover,
        year: 2026,
        description: `Carpeta ${albumTitle}`,
        tracks: [],
        externalLinks: { ...ARTIST_PROFILES }
      });
    }

    const albumObj = albumsMap.get(albumId);
    if (albumObj) {
      albumObj.tracks.push(trackObj);
    }
  }

  // Ensure 'rakunio' album and tracks are ordered first by default
  const albums = Array.from(albumsMap.values()).sort((a, b) => {
    if (a.id === 'rakunio') return -1;
    if (b.id === 'rakunio') return 1;
    return a.title.localeCompare(b.title);
  });

  tracks.sort((a, b) => {
    if (a.albumId === 'rakunio' && b.albumId !== 'rakunio') return -1;
    if (a.albumId !== 'rakunio' && b.albumId === 'rakunio') return 1;
    return a.title.localeCompare(b.title);
  });

  return {
    tracks,
    albums
  };
}

const scanned = scanMusicGlob();

export const TRACKS: Track[] = scanned.tracks;
export const ALBUMS: Album[] = scanned.albums;

export function getTrackById(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}

export function getAlbumById(id: string): Album | undefined {
  return ALBUMS.find((a) => a.id === id);
}

export function getTracksByAlbum(albumId: string): Track[] {
  const album = getAlbumById(albumId);
  return album ? album.tracks : [];
}
