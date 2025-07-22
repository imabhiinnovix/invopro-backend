/* eslint-disable @typescript-eslint/no-explicit-any */
import Product from '../../models/common/product';

export const getProductList = async ({ query, page = 1, limit = 20, sort = { createdAt: -1 }, populate = [] }: any) => {
  try {
    let queryBuilder = Product.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await Product.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};
