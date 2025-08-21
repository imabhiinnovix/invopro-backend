/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { DerivedField } from '../../models/reportivix/derivedField';

export const createDerivedField = async (data: {
  name: string;
  entityId: string;
  type: string;
  persist: boolean;
  valueRules: any[];
}) => {
  const created = await DerivedField.create(data);
  return created;
};

export const updateDerivedField = async (
  id: string,
  data: {
    name: string;
    entityId: string;
    type: string;
    persist: boolean;
    valueRules: any[];
  }
) => {
  const updated = await DerivedField.findByIdAndUpdate(id, data, { new: true });
  return updated;
};

export const deleteDerivedField = async (id: string) => {
  await DerivedField.findByIdAndDelete(id);
};

export const getAllDerivedFields = async (query) => {
  return DerivedField.find(query).populate('entityId');
};

export const findDerivedFieldById = async (id: string, populate = true) => {
  try {
    return await DerivedField.findById(id).populate('entityId');
  } catch (err) {
    throw err;
  }
};

export const getDerivedField = async (query: any) => {
  try {
    const field = await DerivedField.findOne(query).lean();
    return field;
  } catch (err) {
    throw err;
  }
};
