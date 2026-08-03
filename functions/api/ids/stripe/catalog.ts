import {
  IDS_PRODUCT_IDS,
  configuredPrice,
  jsonResponse,
  productDetails,
  type IdsStripeEnv
} from '../../../_utils/ids-stripe';

export const onRequestGet: PagesFunction<IdsStripeEnv> = async ({ env }) =>
  jsonResponse(200, {
    products: IDS_PRODUCT_IDS.map((productId) => ({
      productId,
      localizedPrice: productDetails(productId).localizedPrice,
      available: configuredPrice(env, productId).startsWith('price_')
    }))
  });
