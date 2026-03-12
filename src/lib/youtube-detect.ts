/**
 * YouTube Live Auto-Detect Utility
 *
 * Fetches a YouTube channel's live stream page and extracts the current Video ID
 * without requiring any API key. Uses the standard redirect behavior of:
 *   https://www.youtube.com/@handle/live  →  https://www.youtube.com/watch?v=VIDEO_ID
 *
 * This is safe to run on a VPS — it's a single public HTTP request per GO LIVE action.
 */

/**
 * Auto-detect the active YouTube Live Video ID for a given channel handle.
 * @param channelHandle - e.g. "@namakanal" or "namakanal" (with or without @)
 * @returns videoId string, or null if no live stream is detected
 */
export async function getYouTubeLiveVideoId(channelHandle: string): Promise<string | null> {
  // Normalize: ensure handle starts with @
  const handle = channelHandle.startsWith("@") ? channelHandle : `@${channelHandle}`;
  const liveUrl = `https://www.youtube.com/${handle}/live`;

  try {
    console.log(`[YT Auto-Detect] Fetching live URL: ${liveUrl}`);

    const response = await fetch(liveUrl, {
      method: "GET",
      headers: {
        // Simulate a real browser request to avoid bot detection
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      // Do NOT follow redirects automatically — we want the final URL
      redirect: "follow",
    });

    // After following redirect, the final URL should be watch?v=VIDEO_ID
    const finalUrl = response.url;
    console.log(`[YT Auto-Detect] Final URL after redirect: ${finalUrl}`);

    // Try extracting from URL first (fastest, most reliable)
    const urlMatch = finalUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (urlMatch) {
      const videoId = urlMatch[1];
      console.log(`[YT Auto-Detect] Video ID found in URL: ${videoId}`);
      return videoId;
    }

    // Fallback: parse from page HTML (canonical og:url meta tag)
    const html = await response.text();

    // Try og:url meta tag
    const ogUrlMatch = html.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);
    if (ogUrlMatch) {
      const videoId = ogUrlMatch[1];
      console.log(`[YT Auto-Detect] Video ID found in og:url: ${videoId}`);
      return videoId;
    }

    // Try canonical link tag
    const canonicalMatch = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/);
    if (canonicalMatch) {
      const videoId = canonicalMatch[1];
      console.log(`[YT Auto-Detect] Video ID found in canonical: ${videoId}`);
      return videoId;
    }

    // Try ytInitialData embedded JSON
    const initDataMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (initDataMatch) {
      const videoId = initDataMatch[1];
      console.log(`[YT Auto-Detect] Video ID found in ytInitialData: ${videoId}`);
      return videoId;
    }

    console.warn(`[YT Auto-Detect] No live stream detected for channel ${handle}. Channel may not be live.`);
    return null;

  } catch (error) {
    console.error(`[YT Auto-Detect] Error fetching YouTube live URL:`, error);
    return null;
  }
}
