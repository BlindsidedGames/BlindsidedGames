const HTML_SUFFIX = '.html';
const INDEX_HTML_SUFFIX = '/index.html';

export const getLegacyHtmlRewritePath = (pathname: string): string | null => {
  if (!pathname.endsWith(HTML_SUFFIX)) {
    return null;
  }

  // Cloudflare Pages prefers extensionless URLs. Rewrite legacy .html requests
  // internally so historic store links keep working without a redirect hop.
  if (pathname.endsWith(INDEX_HTML_SUFFIX)) {
    return pathname.slice(0, -'index.html'.length);
  }

  return pathname.slice(0, -HTML_SUFFIX.length);
};
