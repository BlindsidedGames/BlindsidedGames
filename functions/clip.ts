import { htmlResponse, renderClipPage } from './_utils/quiz-shares';

export const onRequestGet: PagesFunction = async (context) =>
  htmlResponse(200, renderClipPage(new URL(context.request.url).origin));
