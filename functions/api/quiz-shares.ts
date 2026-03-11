import {
  buildShareURL,
  enforceCreateRateLimit,
  jsonResponse,
  parseAndValidateShareUpload,
  shareObjectKey,
  type QuizShareEnv
} from '../_utils/quiz-shares';

export const onRequestPost: PagesFunction<QuizShareEnv> = async (context) => {
  const { env, request } = context;

  if (!env.QUIZ_SHARE_BUCKET || !env.QUIZ_SHARE_RATE_LIMIT_KV) {
    return jsonResponse(500, {
      ok: false,
      error: {
        code: 'server_misconfigured',
        message: 'Quiz share storage is not configured.'
      }
    });
  }

  const rateLimit = await enforceCreateRateLimit(request, env);
  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      {
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Too many share uploads. Please retry shortly.'
        }
      },
      {
        'Retry-After': String(rateLimit.retryAfterSeconds)
      }
    );
  }

  const parsed = await parseAndValidateShareUpload(request, env);
  if (!parsed.ok) {
    return parsed.response;
  }

  const shareID = crypto.randomUUID().replaceAll('-', '');
  const objectKey = shareObjectKey(shareID);
  await env.QUIZ_SHARE_BUCKET.put(objectKey, parsed.bytes, {
    httpMetadata: {
      contentType: 'application/vnd.blindsidedgames.quizpack'
    },
    customMetadata: {
      createdAt: parsed.preview.createdAt,
      quizCount: String(parsed.preview.quizCount),
      primaryTitle: parsed.preview.primaryTitle
    }
  });

  const shareURL = buildShareURL(new URL(request.url).origin, shareID);
  return jsonResponse(201, {
    id: shareID,
    shareURL,
    createdAt: parsed.preview.createdAt,
    quizCount: parsed.preview.quizCount,
    primaryTitle: parsed.preview.primaryTitle
  });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS'
    }
  });
