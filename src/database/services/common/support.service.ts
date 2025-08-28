/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import Support from '../../models/common/support';

export const createSupport = async (supportData: any) => {
  try {
    const support = new Support(supportData);
    await support.save();
    return support;
  } catch (err) {
    throw err;
  }
};

export const getSupport = async (query: any) => {
  try {
    const support = await Support.findOne(query);
    return support;
  } catch (err) {
    throw err;
  }
};

export const getSupportById = async (supportId: string) => {
  try {
    const support = await Support.findById(supportId);
    return support;
  } catch (err) {
    throw err;
  }
};

export const updateSupport = async (supportId: string, supportData: any) => {
  try {
    const support = await Support.findByIdAndUpdate(supportId, supportData, { new: true });
    console.log('support', support);

    return support;
  } catch (err) {
    throw err;
  }
};

export const deleteSupport = async (supportId: string) => {
  try {
    await Support.findByIdAndDelete(supportId);
  } catch (err) {
    throw err;
  }
};

export const getSupportList = async ({ query, sort = { createdAt: -1 } }: any) => {
  try {
    const supports = await Support.find(query).sort(sort);
    return supports;
  } catch (err) {
    throw err;
  }
};
