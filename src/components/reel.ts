/* The reel: the video the Play Reel card in the floating navigation plays
   (FloatingNav.astro, ReelLightbox.astro, reel.js).

   To set it, paste the reel's HLS playlist URL from Bunny Stream (the
   video's "HLS Playlist URL", ending /playlist.m3u8) into REEL_SRC. The
   card's still and its hover preview then come from the same video, as
   Bunny publishes them next to the playlist (thumbnail.jpg, and the MP4
   renditions, play_360p.mp4 and play_480p.mp4: the library's "MP4
   fallback" must stay on); either can be set by hand below instead.
   The preview is the film itself, muted, not Bunny's animated
   preview.webp: that is 320 by 180 at a low frame rate, soft and
   stepped at the card's size. reel.js loads the smaller rendition where
   it still covers the card at the screen's density, and only from the
   first hover; the browser fetches only as much as plays.

   Until REEL_SRC is set, the card shows a photograph from the library and
   opens a player that says the reel is on its way — on development and
   staging only: production leaves the card out until there is a reel. */

/** The Bunny Stream HLS playlist, e.g. https://vz-xxxxxxxx-xxx.b-cdn.net/<video id>/playlist.m3u8 */
export const REEL_SRC = 'https://vz-ab77e32b-ab5.b-cdn.net/90484583-5020-4664-8895-f25877ae8ac6/playlist.m3u8';

/** The card's still and the player's placeholder; empty: Bunny's thumbnail.jpg */
export const REEL_POSTER = '';

/** The card's moving preview on hover, a video file played muted; empty: Bunny's MP4 renditions */
export const REEL_PREVIEW = '';

/** The home hero's film frame's hover preview, played muted; empty: Bunny's 720p rendition (the frame crops
    the film's sides and shows its full height, about 650 pixels on a desktop, so the smaller ones are soft) */
export const REEL_FILM = '';

/** The library photograph shown while there is no reel: Tom on stage at the summit */
export const REEL_FALLBACK_POSTER = 'image-88fa0615f2d62869cb66d9387acb2cba609f8c6a-1200x1800-jpg';

// Bunny keeps a video's files side by side: …/<video id>/playlist.m3u8,
// …/thumbnail.jpg, …/play_480p.mp4
const bunnyBase = REEL_SRC.match(/^(https:\/\/[^/]+\/[^/]+)\/playlist\.m3u8(?:\?.*)?$/)?.[1];

export const reelPoster = REEL_POSTER || (bunnyBase ? `${bunnyBase}/thumbnail.jpg` : '');
export const reelPreview = REEL_PREVIEW || (bunnyBase ? `${bunnyBase}/play_480p.mp4` : '');
/** The preview's smaller rendition (854 by 480 against 640 by 360), for a card it still covers; none for one set by hand */
export const reelPreviewSmall = REEL_PREVIEW ? '' : (bunnyBase ? `${bunnyBase}/play_360p.mp4` : '');
export const reelFilm = REEL_FILM || (bunnyBase ? `${bunnyBase}/play_720p.mp4` : '');
