/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import AiCacheModel from '../../models/reportivix/aiCache';

export const createAiCacheData = async (cacheData: any) => {
  try {
    const cacheDataResp = new AiCacheModel(cacheData);
    await cacheDataResp.save();
    return cacheDataResp;
  } catch (err) {
    throw err;
  }
};

export const findCacheDataByCodeAndOrganization = async (code: string, organizationId: string) => {
  try {
    const cacheData = await AiCacheModel.findOne(
      { code, organizationId },
      null, // Projection (null means no specific fields are excluded or included)
      { collation: { locale: 'en', strength: 2 } } // Case-sensitive collation
    );
    return cacheData;
  } catch (err) {
    throw err;
  }
};

export const updateCacheData = async (cacheId: string, cacheData: any) => {
  try {
    const catcheResp = await AiCacheModel.findByIdAndUpdate(cacheId, cacheData, { new: true });
    return catcheResp;
  } catch (err) {
    throw err;
  }
};
