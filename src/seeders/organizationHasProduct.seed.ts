/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Types } from 'mongoose';
import OrganizationProductSubscription from '../database/models/common/organizationProductSubscription';

interface ProductSubscriptionPayload {
  organizationId: Types.ObjectId;
  productIds: Types.ObjectId[];
  totalLicenses: number;
  durationInMonths?: number;
  status?: 'active' | 'inactive';
}

export async function createProductSubscription(payloads: ProductSubscriptionPayload[]) {
  for (const payload of payloads) {
    const { organizationId, productIds, totalLicenses, durationInMonths = 12, status = 'active' } = payload;

    for (const productIdStr of productIds) {
      const productId = new Types.ObjectId(productIdStr);

      // Check if the subscription already exists
      const exists = await OrganizationProductSubscription.findOne({
        organizationId: new Types.ObjectId(organizationId),
        productId,
      });

      if (exists) {
        console.info(`ℹ️ Already exists: Org ${organizationId} with product ${productIdStr}`);
        continue;
      }

      const licenseExpiresAt = new Date();
      licenseExpiresAt.setMonth(licenseExpiresAt.getMonth() + durationInMonths);

      await OrganizationProductSubscription.create({
        organizationId: new Types.ObjectId(organizationId),
        productId,
        totalLicenses,
        licenseExpiresAt,
        status,
      });

      console.info(`✅ Seeded: Org ${organizationId} with product ${productIdStr}`);
    }
  }
}
