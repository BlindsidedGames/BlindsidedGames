import {
  checkoutReturnOrigin,
  createCheckoutSession,
  deviceHash,
  isIdsProductId,
  jsonResponse,
  requireSameOrigin,
  type IdsStripeEnv
} from '../../../_utils/ids-stripe';

export const onRequestPost: PagesFunction<IdsStripeEnv> = async ({ env, request }) => {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse(503, {
      ok: false,
      error: { code: 'store_unavailable', message: 'The Store is not configured.' }
    });
  }
  let body: { productId?: unknown; deviceKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: { code: 'invalid_json' } });
  }
  if (
    !isIdsProductId(body.productId) ||
    typeof body.deviceKey !== 'string' ||
    body.deviceKey.length < 32 ||
    body.deviceKey.length > 128
  ) {
    return jsonResponse(400, { ok: false, error: { code: 'invalid_request' } });
  }
  try {
    const session = await createCheckoutSession(env, {
      productId: body.productId,
      deviceHash: await deviceHash(body.deviceKey),
      returnOrigin: checkoutReturnOrigin(request)
    });
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return jsonResponse(200, { checkoutUrl: session.url });
  } catch (error) {
    console.error('IDS Checkout creation failed', error);
    return jsonResponse(502, {
      ok: false,
      error: { code: 'checkout_failed', message: 'Checkout is temporarily unavailable.' }
    });
  }
};
