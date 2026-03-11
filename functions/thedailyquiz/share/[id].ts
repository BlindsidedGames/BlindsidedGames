import {
  fetchShareMetadata,
  htmlResponse,
  renderSharePage,
  type QuizShareEnv
} from '../../_utils/quiz-shares';

export const onRequestGet: PagesFunction<QuizShareEnv> = async (context) => {
  const shareID = String(context.params.id ?? '').trim();
  if (!shareID) {
    return htmlResponse(400, renderSharePage(new URL(context.request.url).origin, context.env.THE_DAILY_QUIZ_APP_STORE_ID, null));
  }

  const metadata = await fetchShareMetadata(context.env, shareID);
  if (!metadata) {
    return htmlResponse(404, renderSharePage(new URL(context.request.url).origin, context.env.THE_DAILY_QUIZ_APP_STORE_ID, null));
  }

  return htmlResponse(
    200,
    renderSharePage(new URL(context.request.url).origin, context.env.THE_DAILY_QUIZ_APP_STORE_ID, metadata)
  );
};
