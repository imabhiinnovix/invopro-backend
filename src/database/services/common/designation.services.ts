/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import Designation from '../../models/common/designation';
import { PopulateOptions } from 'mongoose';

export const getAllDesignations = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let desigQuery = Designation.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        desigQuery = desigQuery.populate(field);
      });
    }

    const designations = await desigQuery.exec();
    const totalCount = await Designation.countDocuments(query);

    return { data: designations, totalCount };
  } catch (err) {
    throw err;
  }
};

export const createDesignation = async (desigData: any) => {
  try {
    const desig = new Designation(desigData);
    await desig.save();
    return desig;
  } catch (err) {
    throw err;
  }
};

export const findDesignation = async (desigQuery, populateFields: (string | PopulateOptions)[] = []) => {
  let query = Designation.find(desigQuery);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const findDesignationById = async (id: string, populateFields: (string | PopulateOptions)[] = []) => {
  try {
    let query: any = Designation.findById(id);
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    return await query;
  } catch (err) {
    throw err;
  }
};

export const updateDesignation = async (id: string, desigData: any) => {
  try {
    return await Designation.findByIdAndUpdate(id, desigData, { new: true });
  } catch (err) {
    throw err;
  }
};

export const deleteDesignation = async (id: string) => {
  try {
    await Designation.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};

export const designationCount = async (query) => {
  try {
    return await Designation.countDocuments(query);
  } catch (err) {
    throw err;
  }
};
