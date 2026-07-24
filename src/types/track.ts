export interface ExternalLinks {
  spotify?: string | undefined;
  youtube?: string | undefined;
  apple?: string | undefined;
  deezer?: string | undefined;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number; // Duration in seconds
  cover: string;
  audioUrl: string;
  lrcUrl?: string | undefined;
  lrcContent?: string | undefined;
  description?: string | undefined;
  externalLinks?: ExternalLinks | undefined;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  description: string;
  markdownInfo?: string | undefined;
  tracks: Track[];
  externalLinks?: ExternalLinks | undefined;
}
