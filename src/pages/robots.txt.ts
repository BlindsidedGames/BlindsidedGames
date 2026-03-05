const siteOrigin = 'https://blindsidedgames.com';

export function GET() {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap-index.xml\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
