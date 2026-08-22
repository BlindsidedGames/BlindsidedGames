import {
  deviceHash,
  issueEntitlementToken,
  jsonResponse,
  requireSameOrigin,
  resolveEntitlementTokens,
  retrieveCheckoutSession,
  sessionPurchasedProduct,
  type IdsStripeEnv
} from '../../../_utils/ids-stripe';

export const onRequestPost: PagesFunction<IdsStripeEnv> = async ({ env, request }) => {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  if (!env.STRIPE_SECRET_KEY || !env.IDS_STRIPE_TOKEN_SECRET) {
    return jsonResponse(503, {
      ok: false,
      error: { code: 'store_unavailable', message: 'Purchase verification is not configured.' }
    });
  }
  let body: { deviceKey?: unknown; sessionId?: unknown; tokens?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: { code: 'invalid_json' } });
  }
  if (
    typeof body.deviceKey !== 'string' ||
    body.deviceKey.length < 32 ||
    body.deviceKey.length > 128 ||
    (body.sessionId !== undefined && typeof body.sessionId !== 'string') ||
    (body.tokens !== undefined && !Array.isArray(body.tokens))
  ) {
    return jsonResponse(400, { ok: false, error: { code: 'invalid_request' } });
  }

  const expectedDeviceHash = await deviceHash(body.deviceKey);
  const tokens = Array.isArray(body.tokens)
    ? body.tokens.filter((token): token is string => typeof token === 'string').slice(0, 4)
    : [];
  let completedProductId: string | null = null;

  try {
    if (typeof body.sessionId === 'string' && body.sessionId.startsWith('cs_')) {
      const session = await retrieveCheckoutSession(env, body.sessionId);
      const productId = sessionPurchasedProduct(env, session, expectedDeviceHash);
      if (productId === null) {
        return jsonResponse(409, {
          ok: false,
          error: { code: 'purchase_not_verified', message: 'The purchase could not be verified.' }
        });
      }
      completedProductId = productId;
      tokens.push(await issueEntitlementToken(env, {
        sessionId: session.id,
        productId,
        deviceHash: expectedDeviceHash
      }));
    }

    const resolved = await resolveEntitlementTokens(
      env,
      tokens,
      expectedDeviceHash
    );

    return jsonResponse(200, {
      ownership: resolved.ownership,
      tokens: resolved.tokens,
      completedProductId
    });
  } catch (error) {
    console.error('IDS purchase verification failed', error);
    return jsonResponse(502, {
      ok: false,
      error: { code: 'verification_failed', message: 'Purchase verification is temporarily unavailable.' }
    });
  }
};
