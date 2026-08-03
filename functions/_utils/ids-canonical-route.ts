export const IDS_CANONICAL_HOST = 'ids.blindsidedgames.com';
export const IDS_CANONICAL_PATH = '/play/';

export function idsCanonicalRedirect(requestUrl: string): URL | null {
  const url = new URL(requestUrl);

  if (url.hostname.toLowerCase() !== IDS_CANONICAL_HOST) {
    return null;
  }

  if (url.pathname !== '/' && url.pathname !== '/play') {
    return null;
  }

  url.pathname = IDS_CANONICAL_PATH;
  return url;
}

