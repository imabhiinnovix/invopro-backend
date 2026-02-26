/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import Product from '../database/models/common/product';

export async function seedProducts(payload) {
  const predefinedProducts = [
    {
      _id: payload.invoicivixVendorProductId,
      name: 'InvoiciVix Vendor',
      description: '',
      code: 'invoicivixVendor',
    },
  ];

  for (const product of predefinedProducts) {
    const existing = await Product.findById(product._id);

    if (!existing) {
      const newProduct = new Product({
        _id: product._id,
        name: product.name,
        description: product.description,
        code: product.code,
        status: 'active',
      });

      await newProduct.save();
      console.info(`✅ Product "${product.name}" created successfully.`);
    } else {
      console.info(`ℹ️ Product "${product.name}" already exists.`);
    }
  }
}
