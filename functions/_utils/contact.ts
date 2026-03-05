export type ContactRequest = {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
};

export type ContactEnv = {
  TURNSTILE_SECRET_KEY: string;
  CONTACT_TO_EMAIL: string;
  RESEND_API_KEY: string;
  CONTACT_EMAIL_FROM?: string;
  CONTACT_RATE_LIMIT_KV?: KVNamespace;
  CONTACT_RATE_LIMIT_WINDOW_SECONDS?: string;
  CONTACT_RATE_LIMIT_MAX_REQUESTS?: string;
};

export type StructuredError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

const inMemoryRateLimitState = new Map<string, { count: number; resetAt: number }>();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeValue = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

export const parseAndValidateContactRequest = (input: unknown): { data?: ContactRequest; error?: StructuredError } => {
  if (!input || typeof input !== 'object') {
    return {
      error: {
        code: 'invalid_payload',
        message: 'Request body must be JSON.'
      }
    };
  }

  const record = input as Record<string, unknown>;

  const data: ContactRequest = {
    name: sanitizeValue(record.name, 120),
    email: sanitizeValue(record.email, 160),
    subject: sanitizeValue(record.subject, 160),
    message: sanitizeValue(record.message, 5000),
    turnstileToken: sanitizeValue(record.turnstileToken, 4000)
  };

  const fields: Record<string, string> = {};

  if (data.name.length < 2) fields.name = 'Name must be at least 2 characters.';
  if (!EMAIL_REGEX.test(data.email)) fields.email = 'Enter a valid email address.';
  if (data.subject.length < 3) fields.subject = 'Subject must be at least 3 characters.';
  if (data.message.length < 12) fields.message = 'Message must be at least 12 characters.';
  if (!data.turnstileToken) fields.turnstileToken = 'Turnstile verification is required.';

  if (Object.keys(fields).length > 0) {
    return {
      error: {
        code: 'validation_failed',
        message: 'Please correct the highlighted fields.',
        fields
      }
    };
  }

  return { data };
};

export const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });

const getClientIp = (request: Request) => request.headers.get('CF-Connecting-IP') || 'unknown';

const hashRateLimitKey = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const enforceRateLimit = async (
  request: Request,
  env: ContactEnv
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> => {
  const ip = getClientIp(request);
  const key = `contact:${await hashRateLimitKey(ip)}`;
  const now = Date.now();
  const windowSeconds = Number(env.CONTACT_RATE_LIMIT_WINDOW_SECONDS || 600);
  const maxRequests = Number(env.CONTACT_RATE_LIMIT_MAX_REQUESTS || 5);

  if (env.CONTACT_RATE_LIMIT_KV) {
    const currentEntry = await env.CONTACT_RATE_LIMIT_KV.get(key, { type: 'json' }) as
      | { count: number; resetAt: number }
      | null;

    const initialState = { count: 0, resetAt: now + windowSeconds * 1000 };
    const state = currentEntry && currentEntry.resetAt > now ? currentEntry : initialState;

    if (state.count >= maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000))
      };
    }

    state.count += 1;
    await env.CONTACT_RATE_LIMIT_KV.put(key, JSON.stringify(state), {
      expirationTtl: windowSeconds
    });
    return { allowed: true };
  }

  // Fallback for local development when KV is not bound.
  const currentEntry = inMemoryRateLimitState.get(key);
  const initialState = { count: 0, resetAt: now + windowSeconds * 1000 };
  const state = currentEntry && currentEntry.resetAt > now ? currentEntry : initialState;

  if (state.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000))
    };
  }

  state.count += 1;
  inMemoryRateLimitState.set(key, state);
  return { allowed: true };
};

export const verifyTurnstile = async (
  token: string,
  request: Request,
  env: ContactEnv
): Promise<boolean> => {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: getClientIp(request)
    })
  });

  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return Boolean(result.success);
};

export const sendContactEmail = async (payload: ContactRequest, env: ContactEnv): Promise<void> => {
  const from = env.CONTACT_EMAIL_FROM || 'Blindsided Games Contact <no-reply@blindsidedgames.com>';

  const messageText = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Subject: ${payload.subject}`,
    '',
    payload.message
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: payload.email,
      subject: `[Website Contact] ${payload.subject}`,
      text: messageText
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failure: ${response.status} ${body}`);
  }
};
