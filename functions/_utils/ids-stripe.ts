export const IDS_PRODUCT_IDS = [
  'ids.tiptier1',
  'ids.tiptier2',
  'ids.tiptier3',
  'ids.devoptions',
  'ids.doubleip'
] as const;

export type IdsProductId = (typeof IDS_PRODUCT_IDS)[number];

export interface IdsStripeEnv {
  STRIPE_SECRET_KEY: string;
  IDS_STRIPE_TOKEN_SECRET: string;
  IDS_STRIPE_PRICE_TIP_TIER_1: string;
  IDS_STRIPE_PRICE_TIP_TIER_2: string;
  IDS_STRIPE_PRICE_TIP_TIER_3: string;
  IDS_STRIPE_PRICE_DEVELOPER_OPTIONS: string;
  IDS_STRIPE_PRICE_DOUBLE_INFINITY_POINTS: string;
}

export interface StripeCheckoutSession {
  id: string;
  livemode: boolean;
  metadata: Record<string, string> | null;
  payment_status: string;
  status: string | null;
  url?: string | null;
  line_items?: {
    data?: Array<{
      price?: { id?: string } | string | null;
    }>;
  };
}

const PRODUCT_DETAILS: Record<IdsProductId, {
  readonly localizedPrice: string;
  readonly durable: boolean;
  readonly priceKey: keyof IdsStripeEnv;
}> = {
  'ids.tiptier1': {
    localizedPrice: 'A$1.49',
    durable: false,
    priceKey: 'IDS_STRIPE_PRICE_TIP_TIER_1'
  },
  'ids.tiptier2': {
    localizedPrice: 'A$6.99',
    durable: false,
    priceKey: 'IDS_STRIPE_PRICE_TIP_TIER_2'
  },
  'ids.tiptier3': {
    localizedPrice: 'A$30.99',
    durable: false,
    priceKey: 'IDS_STRIPE_PRICE_TIP_TIER_3'
  },
  'ids.devoptions': {
    localizedPrice: 'A$15.99',
    durable: true,
    priceKey: 'IDS_STRIPE_PRICE_DEVELOPER_OPTIONS'
  },
  'ids.doubleip': {
    localizedPrice: 'A$4.99',
    durable: true,
    priceKey: 'IDS_STRIPE_PRICE_DOUBLE_INFINITY_POINTS'
  }
};

export function isIdsProductId(value: unknown): value is IdsProductId {
  return typeof value === 'string' &&
    IDS_PRODUCT_IDS.includes(value as IdsProductId);
}

export function productDetails(productId: IdsProductId) {
  return PRODUCT_DETAILS[productId];
}

export function configuredPrice(env: IdsStripeEnv, productId: IdsProductId): string {
  return env[PRODUCT_DETAILS[productId].priceKey];
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  if (origin === new URL(request.url).origin) return null;
  return jsonResponse(403, {
    ok: false,
    error: { code: 'origin_rejected', message: 'The request origin was rejected.' }
  });
}

export function checkoutReturnOrigin(request: Request): string {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'ids.blindsidedgames.com' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.blindsidedgames.pages.dev')
  ) {
    return url.origin;
  }
  return 'https://ids.blindsidedgames.com';
}

export async function deviceHash(deviceKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textBytes(deviceKey));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function createCheckoutSession(
  env: IdsStripeEnv,
  input: { productId: IdsProductId; deviceHash: string; returnOrigin: string }
): Promise<StripeCheckoutSession> {
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('line_items[0][price]', configuredPrice(env, input.productId));
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', `${input.returnOrigin}/play/?stripe_session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${input.returnOrigin}/play/?stripe_checkout=cancelled`);
  form.set('automatic_tax[enabled]', 'true');
  form.set('metadata[ids_product_id]', input.productId);
  form.set('metadata[ids_device_hash]', input.deviceHash);
  form.set('client_reference_id', input.deviceHash);

  return stripeRequest<StripeCheckoutSession>(env, '/v1/checkout/sessions', {
    method: 'POST',
    body: form
  });
}

export async function retrieveCheckoutSession(
  env: IdsStripeEnv,
  sessionId: string
): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(
    env,
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price`,
    { method: 'GET' }
  );
}

export function sessionPurchasedProduct(
  env: IdsStripeEnv,
  session: StripeCheckoutSession,
  expectedDeviceHash: string
): IdsProductId | null {
  const productId = session.metadata?.ids_product_id;
  if (
    session.payment_status !== 'paid' ||
    session.status !== 'complete' ||
    session.metadata?.ids_device_hash !== expectedDeviceHash ||
    !isIdsProductId(productId)
  ) {
    return null;
  }
  const expectedPrice = configuredPrice(env, productId);
  const hasExpectedPrice = session.line_items?.data?.some((item) => {
    const price = item.price;
    return typeof price === 'string'
      ? price === expectedPrice
      : price?.id === expectedPrice;
  }) === true;
  return hasExpectedPrice ? productId : null;
}

interface EntitlementTokenPayload {
  readonly version: 1;
  readonly sessionId: string;
  readonly productId: 'ids.devoptions' | 'ids.doubleip';
  readonly deviceHash: string;
  readonly issuedAt: number;
}

export async function issueEntitlementToken(
  env: IdsStripeEnv,
  input: Omit<EntitlementTokenPayload, 'version' | 'issuedAt'>
): Promise<string> {
  const payload: EntitlementTokenPayload = {
    version: 1,
    ...input,
    issuedAt: Date.now()
  };
  const encodedPayload = base64UrlEncode(textBytes(JSON.stringify(payload)));
  return `${encodedPayload}.${await sign(env, encodedPayload)}`;
}

export async function verifyEntitlementToken(
  env: IdsStripeEnv,
  token: string,
  expectedDeviceHash: string
): Promise<EntitlementTokenPayload | null> {
  const [encodedPayload, providedSignature, extra] = token.split('.');
  if (!encodedPayload || !providedSignature || extra !== undefined) return null;
  const expectedSignature = await sign(env, encodedPayload);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return null;
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload))
    ) as Partial<EntitlementTokenPayload>;
    if (
      parsed.version !== 1 ||
      parsed.deviceHash !== expectedDeviceHash ||
      (parsed.productId !== 'ids.devoptions' && parsed.productId !== 'ids.doubleip') ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.issuedAt !== 'number'
    ) {
      return null;
    }
    return parsed as EntitlementTokenPayload;
  } catch {
    return null;
  }
}

async function stripeRequest<T>(
  env: IdsStripeEnv,
  path: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/x-www-form-urlencoded' })
    }
  });
  if (!response.ok) {
    throw new Error(`Stripe returned HTTP ${response.status}.`);
  }
  return response.json<T>();
}

async function sign(env: IdsStripeEnv, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textBytes(env.IDS_STRIPE_TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, textBytes(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function textBytes(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(value));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
