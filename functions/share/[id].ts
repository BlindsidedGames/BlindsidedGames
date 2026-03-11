import {
  fetchShareMetadata,
  htmlResponse,
  renderSharePage,
  type QuizShareEnv
} from '../_utils/quiz-shares';

export const onRequestGet: PagesFunction<QuizShareEnv> = async (context) => {
  const shareID = String(context.params.id ?? '').trim();
  if (!shareID) {
    return htmlResponse(400, renderSharePage(new URL(context.request.url).origin, null));
  }

  const metadata = await fetchShareMetadata(context.env, shareID);
  if (!metadata) {
    return htmlResponse(404, renderSharePage(new URL(context.request.url).origin, null));
  }

  return htmlResponse(200, renderSharePage(new URL(context.request.url).origin, metadata));
};
