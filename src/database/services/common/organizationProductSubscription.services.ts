import organizationProductSubscription from '../../models/reportivix/organizationProductSubscription';

export const getOrganizationProducts = async ({
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 },
  populate = [],
}: any) => {
  try {
    let queryBuilder = organizationProductSubscription
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await organizationProductSubscription.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};
