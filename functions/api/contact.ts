import {
  enforceRateLimit,
  jsonResponse,
  parseAndValidateContactRequest,
  sendContactEmail,
  verifyTurnstile,
  type ContactEnv
} from '../_utils/contact';

const requiredEnvVars = ['TURNSTILE_SECRET_KEY', 'CONTACT_TO_EMAIL', 'RESEND_API_KEY'] as const;

export const onRequestPost: PagesFunction<ContactEnv> = async (context) => {
  const { env, request } = context;

  for (const key of requiredEnvVars) {
    if (!env[key]) {
      return jsonResponse(500, {
        ok: false,
        error: {
          code: 'server_misconfigured',
          message: `Server configuration missing ${key}.`
        }
      });
    }
  }

  const rateLimitResult = await enforceRateLimit(request, env);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'rate_limited',
          message: 'Too many requests. Please retry shortly.'
        }
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimitResult.retryAfterSeconds)
        }
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: {
        code: 'invalid_json',
        message: 'Request body must be valid JSON.'
      }
    });
  }

  const parsed = parseAndValidateContactRequest(body);
  if (parsed.error) {
    return jsonResponse(400, {
      ok: false,
      error: parsed.error
    });
  }

  const turnstileResult = await verifyTurnstile(parsed.data.turnstileToken, request, env);
  if (!turnstileResult.success) {
    const firstErrorCode = turnstileResult.errorCodes[0] || 'unknown';
    console.warn('Turnstile verification failed', {
      httpStatus: turnstileResult.httpStatus,
      errorCodes: turnstileResult.errorCodes,
      cfRay: request.headers.get('CF-Ray') || null
    });

    return jsonResponse(400, {
      ok: false,
      error: {
        code: 'turnstile_failed',
        message: `Turnstile verification failed (${firstErrorCode}). Please retry.`,
        fields: {
          turnstileToken: `Turnstile verification failed (${firstErrorCode}). Please retry.`
        }
      }
    });
  }

  try {
    await sendContactEmail(parsed.data, env);
    return jsonResponse(200, {
      ok: true,
      message: 'Message sent successfully.'
    });
  } catch (error) {
    console.error('Contact submission email error', error);
    return jsonResponse(502, {
      ok: false,
      error: {
        code: 'delivery_failed',
        message: 'Message could not be delivered right now. Please retry or email support directly.'
      }
    });
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS'
    }
  });
