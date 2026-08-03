import { idsCanonicalRedirect } from './_utils/ids-canonical-route';

export const onRequest: PagesFunction = async (context) => {
  const redirectUrl = idsCanonicalRedirect(context.request.url);

  if (redirectUrl) {
    return Response.redirect(redirectUrl, 308);
  }

  return context.next();
};

