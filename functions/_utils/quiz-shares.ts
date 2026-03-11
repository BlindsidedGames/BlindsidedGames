export interface QuizShareEnv {
  QUIZ_SHARE_BUCKET: R2Bucket;
  QUIZ_SHARE_RATE_LIMIT_KV: KVNamespace;
  QUIZ_SHARE_MAX_BYTES?: string;
  QUIZ_SHARE_CREATE_WINDOW_SECONDS?: string;
  QUIZ_SHARE_CREATE_MAX_REQUESTS?: string;
}

export interface QuizSharePreviewMetadata {
  id: string;
  createdAt: string;
  quizCount: number;
  primaryTitle: string;
}

interface QuizTransferPackagePayload {
  version: number;
  exportedAt: string;
  quizzes: QuizTransferEntryPayload[];
}

interface QuizTransferEntryPayload {
  documentID: string;
  title: string;
  category: string;
  difficulty: string;
  source: string;
  document: {
    id: string;
    title: string;
    sections: Array<{
      title: string;
      items: unknown[];
    }>;
  };
}

const QUIZPACK_CONTENT_TYPE = 'application/vnd.blindsidedgames.quizpack';
const MAX_SHARE_BYTES = 1_000_000;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 600;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 20;

const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);
const ALLOWED_SOURCES = new Set(['importedCustom', 'generatedCustom', 'claimedDaily']);

export function jsonResponse(status: number, body: unknown, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function htmlResponse(status: number, html: string, headers: HeadersInit = {}): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function buildShareURL(origin: string, shareID: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/share/${shareID}`;
}

export function buildClipURL(origin: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/clip`;
}

export function getMaxShareBytes(env: QuizShareEnv): number {
  const parsed = Number(env.QUIZ_SHARE_MAX_BYTES);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return MAX_SHARE_BYTES;
}

export async function enforceCreateRateLimit(request: Request, env: QuizShareEnv): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowSeconds = safePositiveInteger(env.QUIZ_SHARE_CREATE_WINDOW_SECONDS, DEFAULT_RATE_LIMIT_WINDOW_SECONDS);
  const maxRequests = safePositiveInteger(env.QUIZ_SHARE_CREATE_MAX_REQUESTS, DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const ipAddress = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `quiz-share:${ipAddress}:${bucket}`;
  const currentValue = await env.QUIZ_SHARE_RATE_LIMIT_KV.get(key);
  const currentCount = currentValue ? Number.parseInt(currentValue, 10) : 0;

  if (Number.isFinite(currentCount) && currentCount >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: windowSeconds
    };
  }

  const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
  await env.QUIZ_SHARE_RATE_LIMIT_KV.put(key, String(nextCount), {
    expirationTtl: windowSeconds
  });

  return {
    allowed: true,
    retryAfterSeconds: 0
  };
}

export async function parseAndValidateShareUpload(request: Request, env: QuizShareEnv): Promise<
  | { ok: true; bytes: Uint8Array; payload: QuizTransferPackagePayload; preview: Omit<QuizSharePreviewMetadata, 'id'> }
  | { ok: false; response: Response }
> {
  if (!request.headers.get('Content-Type')?.toLowerCase().includes(QUIZPACK_CONTENT_TYPE)) {
    return {
      ok: false,
      response: jsonResponse(415, {
        ok: false,
        error: {
          code: 'unsupported_content_type',
          message: `Content-Type must be ${QUIZPACK_CONTENT_TYPE}.`
        }
      })
    };
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  const maxBytes = getMaxShareBytes(env);
  if (bytes.byteLength == 0 || bytes.byteLength > maxBytes) {
    return {
      ok: false,
      response: jsonResponse(413, {
        ok: false,
        error: {
          code: 'payload_too_large',
          message: `Quiz share payloads must be between 1 byte and ${maxBytes} bytes.`
        }
      })
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {
      ok: false,
      response: jsonResponse(400, {
        ok: false,
        error: {
          code: 'invalid_json',
          message: 'Quiz share uploads must be valid JSON.'
        }
      })
    };
  }

  const validation = validateQuizTransferPackage(parsed);
  if (!validation.ok) {
    return {
      ok: false,
      response: jsonResponse(400, {
        ok: false,
        error: validation.error
      })
    };
  }

  return {
    ok: true,
    bytes,
    payload: validation.payload,
    preview: validation.preview
  };
}

export async function fetchShareMetadata(env: QuizShareEnv, shareID: string): Promise<QuizSharePreviewMetadata | null> {
  const object = await env.QUIZ_SHARE_BUCKET.head(shareObjectKey(shareID));
  if (!object) {
    return null;
  }

  const quizCount = Number.parseInt(object.customMetadata?.quizCount ?? '', 10);
  return {
    id: shareID,
    createdAt: object.customMetadata?.createdAt ?? new Date().toISOString(),
    quizCount: Number.isFinite(quizCount) ? quizCount : 0,
    primaryTitle: object.customMetadata?.primaryTitle ?? 'Shared Quiz Pack'
  };
}

export function shareObjectKey(shareID: string): string {
  return `quiz-shares/${shareID}.quizpack`;
}

export function renderSharePage(origin: string, metadata: QuizSharePreviewMetadata | null): string {
  const title = metadata ? `Open ${escapeHtml(metadata.primaryTitle)} in The Quiz` : 'Shared Quiz Pack';
  const description = metadata
    ? `${metadata.quizCount} quiz${metadata.quizCount === 1 ? '' : 'zes'} ready to review in The Quiz.`
    : 'Open this shared quiz pack in The Quiz.';
  const shareURL = metadata ? buildShareURL(origin, metadata.id) : `${origin.replace(/\/$/, '')}/share`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${shareURL}" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f8fb;
        --card: #ffffff;
        --text: #152033;
        --muted: #617089;
        --accent: #0f7fd4;
        --border: rgba(21, 32, 51, 0.12);
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top left, rgba(15, 127, 212, 0.12), transparent 38%),
          radial-gradient(circle at bottom right, rgba(13, 163, 117, 0.12), transparent 32%),
          var(--bg);
        color: var(--text);
        font-family: "Avenir Next", Avenir, "Helvetica Neue", sans-serif;
      }
      main {
        width: min(92vw, 640px);
        padding: 32px;
        border-radius: 28px;
        background: var(--card);
        border: 1px solid var(--border);
        box-shadow: 0 24px 60px rgba(20, 31, 50, 0.14);
      }
      .eyebrow {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(15, 127, 212, 0.1);
        color: var(--accent);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      h1 {
        margin: 18px 0 10px;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1.02;
      }
      p {
        margin: 0;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.5;
      }
      .meta {
        margin-top: 18px;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .cta {
        margin-top: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 20px;
        border-radius: 16px;
        background: var(--accent);
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">The Quiz Share</div>
      <h1>${title}</h1>
      <p>${escapeHtml(description)}</p>
      ${metadata ? `<p class="meta">Share ID: ${escapeHtml(metadata.id)} • Created ${escapeHtml(metadata.createdAt)}</p>` : ''}
      <a class="cta" href="${shareURL}">Open in The Quiz</a>
    </main>
  </body>
</html>`;
}

export function renderClipPage(origin: string): string {
  const clipURL = buildClipURL(origin);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>The Quiz Demo</title>
    <meta name="description" content="Try a 10-question Trivia demo in The Quiz." />
    <meta property="og:title" content="The Quiz Demo" />
    <meta property="og:description" content="Try a 10-question Trivia demo in The Quiz." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${clipURL}" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #eef7ff 0%, #f5fbf8 100%);
        color: #152033;
        font-family: "Avenir Next", Avenir, "Helvetica Neue", sans-serif;
      }
      main {
        width: min(92vw, 620px);
        padding: 32px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(21, 32, 51, 0.12);
        box-shadow: 0 24px 60px rgba(20, 31, 50, 0.14);
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 5vw, 3rem);
      }
      p {
        margin: 0;
        color: #617089;
        font-size: 1.05rem;
        line-height: 1.5;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        margin-top: 28px;
        padding: 0 20px;
        border-radius: 16px;
        background: #0f7fd4;
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Try The Quiz</h1>
      <p>Jump into a built-in 10-question Trivia demo, then install the full app to keep every shared quiz locally.</p>
      <a href="${clipURL}">Open The Quiz</a>
    </main>
  </body>
</html>`;
}

function validateQuizTransferPackage(payload: unknown):
  | { ok: true; payload: QuizTransferPackagePayload; preview: Omit<QuizSharePreviewMetadata, 'id'> }
  | { ok: false; error: { code: string; message: string } } {
  if (!isRecord(payload)) {
    return invalidPackage('invalid_package', 'Quiz share payload must be a JSON object.');
  }

  const version = payload.version;
  const exportedAt = payload.exportedAt;
  const quizzes = payload.quizzes;
  if (!Number.isFinite(version) || typeof exportedAt !== 'string' || !Array.isArray(quizzes)) {
    return invalidPackage('invalid_package', 'Quiz share payload is missing package metadata.');
  }
  if (quizzes.length === 0) {
    return invalidPackage('empty_package', 'Quiz share payload must include at least one quiz.');
  }

  for (const entry of quizzes) {
    if (!isValidTransferEntry(entry)) {
      return invalidPackage('invalid_package', 'Quiz share payload includes an invalid quiz entry.');
    }
  }

  const primaryTitle = firstMeaningfulTitle(quizzes[0]);
  return {
    ok: true,
    payload: payload as QuizTransferPackagePayload,
    preview: {
      createdAt: new Date().toISOString(),
      quizCount: quizzes.length,
      primaryTitle
    }
  };
}

function isValidTransferEntry(value: unknown): value is QuizTransferEntryPayload {
  if (!isRecord(value)) {
    return false;
  }

  const document = value.document;
  return (
    typeof value.documentID === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.difficulty === 'string' &&
    ALLOWED_DIFFICULTIES.has(value.difficulty) &&
    typeof value.source === 'string' &&
    ALLOWED_SOURCES.has(value.source) &&
    isRecord(document) &&
    typeof document.id === 'string' &&
    typeof document.title === 'string' &&
    Array.isArray(document.sections) &&
    document.sections.every((section) => isRecord(section) && typeof section.title === 'string' && Array.isArray(section.items))
  );
}

function firstMeaningfulTitle(entry: QuizTransferEntryPayload): string {
  const title = entry.title.trim();
  if (title.length > 0) {
    return title;
  }
  const documentTitle = entry.document.title.trim();
  return documentTitle.length > 0 ? documentTitle : 'Shared Quiz Pack';
}

function invalidPackage(code: string, message: string) {
  return {
    ok: false as const,
    error: {
      code,
      message
    }
  };
}

function safePositiveInteger(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
