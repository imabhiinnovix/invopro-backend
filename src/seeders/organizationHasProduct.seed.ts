import { Types } from 'mongoose';
import Product from '../database/models/common/product';
import OrganizationProductSubscription from '../database/models/common/organizationProductSubscription';

export async function hardcodedSeedOrganizationProductSubscriptions() {
  const organizationIds = [
    new Types.ObjectId('66de96d3548d06560e2931cb'),
    new Types.ObjectId('64d229e76e4d3f1d2f9f3e8c'),
  ];

  const productCodes = ['reportivix', 'notivix'];
  const products = await Product.find({ code: { $in: productCodes } });

  const productMap = new Map(products.map((p) => [p.code, p._id]));

  const licenseDurationInMonths = 12;
  const totalLicenses = 20;

  for (const orgId of organizationIds) {
    for (const productName of productCodes) {
      const productId = productMap.get(productName);
      if (!productId) {
        console.warn(`Product "${productName}" not found.`);
        continue;
      }

      const exists = await OrganizationProductSubscription.findOne({
        organizationId: orgId,
        productId,
      });

      if (!exists) {
        const licenseExpiresAt = new Date();
        licenseExpiresAt.setMonth(licenseExpiresAt.getMonth() + licenseDurationInMonths);
        await OrganizationProductSubscription.create({
          organizationId: orgId,
          productId,
          status: 'active',
          totalLicenses,
          licenseExpiresAt: licenseExpiresAt,
        });

        console.info(`Seeded: Org ${orgId} with product ${productName}`);
      } else {
        console.info(`Already exists: Org ${orgId} with product ${productName}`);
      }
    }
  }
}
