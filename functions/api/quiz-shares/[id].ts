import { jsonResponse, shareObjectKey, type QuizShareEnv } from '../../_utils/quiz-shares';

export const onRequestGet: PagesFunction<QuizShareEnv> = async (context) => {
  const shareID = String(context.params.id ?? '').trim();
  if (!shareID) {
    return jsonResponse(400, {
      ok: false,
      error: {
        code: 'missing_share_id',
        message: 'Quiz share ID is required.'
      }
    });
  }

  const object = await context.env.QUIZ_SHARE_BUCKET.get(shareObjectKey(shareID));
  if (!object) {
    return jsonResponse(404, {
      ok: false,
      error: {
        code: 'not_found',
        message: 'Quiz share not found.'
      }
    });
  }

  const headers = new Headers({
    'Content-Type': 'application/vnd.blindsidedgames.quizpack',
    'Cache-Control': 'public, max-age=60'
  });
  object.writeHttpMetadata(headers);

  return new Response(object.body, {
    status: 200,
    headers
  });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      Allow: 'GET, OPTIONS'
    }
  });
