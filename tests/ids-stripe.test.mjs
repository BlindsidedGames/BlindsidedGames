import assert from 'node:assert/strict';
import test from 'node:test';

import {
  issueEntitlementToken,
  resolveEntitlementTokens,
  sessionPurchasedProduct
} from '../functions/_utils/ids-stripe.ts';

const env = Object.freeze({
  STRIPE_SECRET_KEY: 'sk_test_not_used',
  IDS_STRIPE_TOKEN_SECRET: 'test-token-secret-with-enough-entropy',
  IDS_STRIPE_PRICE_TIP_TIER_1: 'price_tip_1',
  IDS_STRIPE_PRICE_TIP_TIER_2: 'price_tip_2',
  IDS_STRIPE_PRICE_TIP_TIER_3: 'price_tip_3',
  IDS_STRIPE_PRICE_DEVELOPER_OPTIONS: 'price_dev',
  IDS_STRIPE_PRICE_DOUBLE_INFINITY_POINTS: 'price_double'
});

const deviceHash = 'browser-device-hash';

async function token(productId, sessionId = `cs_${productId}`) {
  return issueEntitlementToken(env, { sessionId, productId, deviceHash });
}

test('every supporter tier grants the same persistent gallery entitlement', async () => {
  for (const productId of ['ids.tiptier1', 'ids.tiptier2', 'ids.tiptier3']) {
    const receipt = await token(productId);
    const resolved = await resolveEntitlementTokens(env, [receipt], deviceHash);
    assert.deepEqual(resolved.ownership, {
      developerOptions: false,
      doubleInfinityPoints: false,
      supporterCatGallery: true
    });
    assert.deepEqual(resolved.tokens, [receipt]);
  }
});

test('receipts are device-bound, signed, and canonicalized to one per grant', async () => {
  const receipts = await Promise.all([
    token('ids.tiptier1'),
    token('ids.tiptier2'),
    token('ids.tiptier3'),
    token('ids.devoptions'),
    token('ids.doubleip')
  ]);
  const resolved = await resolveEntitlementTokens(env, receipts, deviceHash);
  assert.deepEqual(resolved.ownership, {
    developerOptions: true,
    doubleInfinityPoints: true,
    supporterCatGallery: true
  });
  assert.equal(resolved.tokens.length, 3);

  const wrongDevice = await resolveEntitlementTokens(env, receipts, 'other-device');
  assert.deepEqual(wrongDevice.ownership, {
    developerOptions: false,
    doubleInfinityPoints: false,
    supporterCatGallery: false
  });
  assert.deepEqual(wrongDevice.tokens, []);

  const tampered = `${receipts[0].slice(0, -1)}x`;
  const rejected = await resolveEntitlementTokens(env, [tampered], deviceHash);
  assert.equal(rejected.ownership.supporterCatGallery, false);
  assert.deepEqual(rejected.tokens, []);
});

test('Stripe completion must be paid, complete, device-bound, and correctly priced', () => {
  const validSession = {
    id: 'cs_valid',
    livemode: false,
    metadata: {
      ids_product_id: 'ids.tiptier1',
      ids_device_hash: deviceHash
    },
    payment_status: 'paid',
    status: 'complete',
    line_items: { data: [{ price: { id: 'price_tip_1' } }] }
  };
  assert.equal(
    sessionPurchasedProduct(env, validSession, deviceHash),
    'ids.tiptier1'
  );
  assert.equal(
    sessionPurchasedProduct(
      env,
      { ...validSession, payment_status: 'unpaid' },
      deviceHash
    ),
    null
  );
  assert.equal(
    sessionPurchasedProduct(
      env,
      { ...validSession, line_items: { data: [{ price: 'price_wrong' }] } },
      deviceHash
    ),
    null
  );
  assert.equal(sessionPurchasedProduct(env, validSession, 'other-device'), null);
});
