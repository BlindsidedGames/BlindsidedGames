export interface QuizShareEnv {
  QUIZ_SHARE_BUCKET: R2Bucket;
  QUIZ_SHARE_RATE_LIMIT_KV: KVNamespace;
  QUIZ_SHARE_MAX_BYTES?: string;
  QUIZ_SHARE_CREATE_WINDOW_SECONDS?: string;
  QUIZ_SHARE_CREATE_MAX_REQUESTS?: string;
  THE_DAILY_QUIZ_APP_STORE_ID?: string;
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
const QUIZ_MICROSITE_SLUG = 'thedailyquiz';
const QUIZ_APP_NAME = 'The Daily Quiz';
const QUIZ_APP_CLIP_BUNDLE_ID = 'com.blindsidedgames.quizzing.clip';
const QUIZ_ICON_PATH = '/img/the-daily-quiz-icon.png';
const QUIZ_OG_IMAGE_PATH = '/img/the-daily-quiz-share-card.svg';

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
  return `${base}/${QUIZ_MICROSITE_SLUG}/share/${shareID}`;
}

export function buildClipURL(origin: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/${QUIZ_MICROSITE_SLUG}/clip`;
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

export function renderSharePage(origin: string, appStoreID: string | undefined, metadata: QuizSharePreviewMetadata | null): string {
  const title = metadata ? metadata.primaryTitle : 'Shared quiz ready';
  const quizCount = metadata?.quizCount ?? 0;
  const description = metadata
    ? `${quizCount} quiz${quizCount === 1 ? '' : 'zes'} ready to open in ${QUIZ_APP_NAME} on iPhone.`
    : `Open this shared quiz in ${QUIZ_APP_NAME} on iPhone.`;
  const shareURL = metadata ? buildShareURL(origin, metadata.id) : `${origin.replace(/\/$/, '')}/${QUIZ_MICROSITE_SLUG}/share`;

  return renderQuizMicrositePage(origin, {
    canonicalURL: shareURL,
    pageTitle: metadata ? `${title} | ${QUIZ_APP_NAME}` : `${QUIZ_APP_NAME} Shared Quiz`,
    pageDescription: description,
    eyebrow: metadata ? 'Shared quiz' : 'Quiz share',
    heading: title,
    body:
      metadata
        ? `This shared pack includes ${quizCount} quiz${quizCount === 1 ? '' : 'zes'} and opens directly in ${QUIZ_APP_NAME} on iPhone.`
        : `This link opens a shared quiz in ${QUIZ_APP_NAME} on iPhone.`,
    detail:
      metadata
        ? `${quizCount} quiz${quizCount === 1 ? '' : 'zes'} ready to import`
        : 'Open on iPhone in Safari or Messages.',
    supportText: `Safari and Messages will hand this link to ${QUIZ_APP_NAME} or its App Clip when available.`,
    chips: [
      metadata ? `${quizCount} quiz${quizCount === 1 ? '' : 'zes'}` : 'Shared quiz',
      'Open on iPhone',
      `From ${QUIZ_APP_NAME}`
    ]
  }, appStoreID);
}

export function renderClipPage(origin: string, appStoreID: string | undefined): string {
  const clipURL = buildClipURL(origin);
  return renderQuizMicrositePage(origin, {
    canonicalURL: clipURL,
    pageTitle: `${QUIZ_APP_NAME} App Clip`,
    pageDescription: `Play a 10-question trivia demo in ${QUIZ_APP_NAME} on iPhone, then install the full app for daily play, shared quiz packs, and permanent saves.`,
    eyebrow: 'App Clip',
    heading: QUIZ_APP_NAME,
    body: `Play a 10-question trivia demo instantly, then keep the full experience for daily challenges, shared quiz packs, and permanent saves.`,
    detail: 'Built for fast launches from Safari and Messages on iPhone.',
    supportText: `Open this page in Safari or Messages on iPhone to surface the ${QUIZ_APP_NAME} App Clip or the full app when available.`,
    chips: ['10-question demo', 'Daily challenge app', 'Shared quiz support']
  }, appStoreID);
}

interface QuizMicrositePageConfig {
  canonicalURL: string;
  pageTitle: string;
  pageDescription: string;
  eyebrow: string;
  heading: string;
  body: string;
  detail: string;
  supportText: string;
  chips: string[];
}

// Keep the app microsite pages visually aligned while allowing clip/share-specific copy.
function renderQuizMicrositePage(origin: string, config: QuizMicrositePageConfig, appStoreID: string | undefined): string {
  const ogImageURL = new URL(QUIZ_OG_IMAGE_PATH, origin).toString();
  const iconURL = new URL(QUIZ_ICON_PATH, origin).toString();
  const appStoreURL = buildAppStoreURL(appStoreID);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#101a2b" />
    <meta name="robots" content="index,follow" />
    <title>${escapeHtml(config.pageTitle)}</title>
    <meta name="description" content="${escapeHtml(config.pageDescription)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${QUIZ_APP_NAME}" />
    <meta property="og:title" content="${escapeHtml(config.pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(config.pageDescription)}" />
    <meta property="og:url" content="${escapeHtml(config.canonicalURL)}" />
    <meta property="og:image" content="${escapeHtml(ogImageURL)}" />
    <meta property="og:image:alt" content="${QUIZ_APP_NAME} preview art" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(config.pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(config.pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageURL)}" />
    <link rel="canonical" href="${escapeHtml(config.canonicalURL)}" />
    <link rel="icon" type="image/png" href="${escapeHtml(iconURL)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
      rel="stylesheet"
    />
    ${buildSmartBannerMeta(appStoreID)}
    <style>
      :root {
        color-scheme: dark;
        --bg: #09101c;
        --panel: rgba(15, 23, 38, 0.86);
        --panel-border: rgba(146, 177, 220, 0.16);
        --card: rgba(255, 255, 255, 0.06);
        --text: #f4f7fb;
        --muted: #b4c3db;
        --accent: #49a4ff;
        --accent-strong: #1578eb;
        --shadow: 0 32px 90px rgba(0, 0, 0, 0.42);
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 28px 16px;
        background:
          radial-gradient(circle at top left, rgba(73, 164, 255, 0.24), transparent 34%),
          radial-gradient(circle at bottom right, rgba(74, 228, 185, 0.18), transparent 26%),
          linear-gradient(180deg, #111a2c 0%, #09101c 100%);
        color: var(--text);
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", sans-serif;
      }
      main {
        width: min(96vw, 760px);
        padding: 32px;
        border-radius: 32px;
        border: 1px solid var(--panel-border);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)),
          var(--panel);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }
      .brand-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 28px;
      }
      .brand-row img {
        width: 76px;
        height: 76px;
        border-radius: 20px;
        box-shadow: 0 14px 34px rgba(21, 120, 235, 0.28);
      }
      .brand-copy {
        min-width: 0;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(73, 164, 255, 0.14);
        color: #9ed0ff;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .studio {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 0.95rem;
      }
      h1 {
        margin: 20px 0 14px;
        max-width: 10ch;
        font-family: "Sora", "Manrope", sans-serif;
        font-size: clamp(2.6rem, 8vw, 4.2rem);
        line-height: 0.96;
        letter-spacing: -0.04em;
      }
      .lead {
        margin: 0;
        max-width: 36rem;
        color: #d5e2f4;
        font-size: 1.12rem;
        line-height: 1.68;
      }
      .support {
        margin: 16px 0 0;
        max-width: 40rem;
        color: var(--muted);
        font-size: 0.97rem;
        line-height: 1.6;
      }
      .detail {
        margin: 26px 0 0;
        font-size: 0.95rem;
        color: #9ed0ff;
        font-weight: 700;
      }
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 24px 0 0;
        padding: 0;
        list-style: none;
      }
      .chip-row li {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: var(--card);
        color: #f1f6ff;
        font-size: 0.93rem;
        font-weight: 700;
      }
      .actions {
        margin-top: 30px;
      }
      .cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 22px;
        border-radius: 16px;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: white;
        text-decoration: none;
        font-weight: 800;
        box-shadow: 0 16px 34px rgba(21, 120, 235, 0.28);
      }
      .footer-note {
        margin-top: 30px;
        padding-top: 18px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        color: var(--muted);
        font-size: 0.92rem;
      }
      @media (max-width: 640px) {
        main {
          padding: 24px;
          border-radius: 28px;
        }
        .brand-row {
          align-items: flex-start;
        }
        h1 {
          max-width: none;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="brand-row">
        <img src="${escapeHtml(iconURL)}" alt="${QUIZ_APP_NAME} icon" width="76" height="76" />
        <div class="brand-copy">
          <div class="eyebrow">${escapeHtml(config.eyebrow)}</div>
          <p class="studio">${QUIZ_APP_NAME} by Blindsided Games</p>
        </div>
      </div>
      <h1>${escapeHtml(config.heading)}</h1>
      <p class="lead">${escapeHtml(config.body)}</p>
      <p class="support">${escapeHtml(config.supportText)}</p>
      <p class="detail">${escapeHtml(config.detail)}</p>
      <ul class="chip-row">
        ${config.chips.map((chip) => `<li>${escapeHtml(chip)}</li>`).join('')}
      </ul>
      ${
        appStoreURL
          ? `<div class="actions"><a class="cta" href="${escapeHtml(appStoreURL)}" target="_blank" rel="noopener noreferrer">Get the full app</a></div>`
          : ''
      }
      <p class="footer-note">Designed for a focused App Clip and shared-quiz handoff on iPhone.</p>
    </main>
  </body>
</html>`;
}

function buildAppStoreURL(appStoreID: string | undefined): string | null {
  const trimmed = appStoreID?.trim() ?? '';
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return `https://apps.apple.com/app/id${trimmed}`;
}

function buildSmartBannerMeta(appStoreID: string | undefined): string {
  const trimmed = appStoreID?.trim() ?? '';
  if (!/^\d+$/.test(trimmed)) {
    return '';
  }
  return `<meta name="apple-itunes-app" content="app-id=${trimmed}, app-clip-bundle-id=${QUIZ_APP_CLIP_BUNDLE_ID}, app-clip-display=card" />`;
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
