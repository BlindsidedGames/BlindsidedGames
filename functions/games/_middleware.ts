import { getLegacyHtmlRewritePath } from '../_utils/legacy-html';

export const onRequest: PagesFunction = async (context) => {
  const rewrittenPath = getLegacyHtmlRewritePath(new URL(context.request.url).pathname);

  if (!rewrittenPath) {
    return context.next();
  }

  const rewrittenUrl = new URL(context.request.url);
  rewrittenUrl.pathname = rewrittenPath;

  return context.next(new Request(rewrittenUrl, context.request));
};
