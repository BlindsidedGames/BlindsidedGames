import { htmlResponse, renderClipPage, type QuizShareEnv } from '../_utils/quiz-shares';

export const onRequestGet: PagesFunction<QuizShareEnv> = async (context) =>
  htmlResponse(200, renderClipPage(new URL(context.request.url).origin, context.env.THE_DAILY_QUIZ_APP_STORE_ID));
