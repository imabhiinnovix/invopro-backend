/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import BusinessUnit from '../../models/common/businessUnit'
import { PopulateOptions } from 'mongoose';

export const getAllBusinessUnits = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let deptQuery = BusinessUnit.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        deptQuery = deptQuery.populate(field);
      });
    }

    const businessUnits = await deptQuery.exec();
    const totalCount = await BusinessUnit.countDocuments(query);

    return { data: businessUnits, totalCount };
  } catch (err) {
    throw err;
  }
};

export const createBusinessUnit = async (deptData: any) => {
  try {
    const dept = new BusinessUnit(deptData);
    await dept.save();
    return dept;
  } catch (err) {
    throw err;
  }
};

export const findBusinessUnit = async (deptQuery, populateFields: (string | PopulateOptions)[] = []) => {
  let query = BusinessUnit.find(deptQuery);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const findBusinessUnitById = async (id: string, populateFields: (string | PopulateOptions)[] = []) => {
  try {
    let query: any = BusinessUnit.findById(id);
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    return await query;
  } catch (err) {
    throw err;
  }
};

export const updateBusinessUnit = async (id: string, deptData: any) => {
  try {
    return await BusinessUnit.findByIdAndUpdate(id, deptData, { new: true });
  } catch (err) {
    throw err;
  }
};

export const deleteBusinessUnit = async (id: string) => {
  try {
    await BusinessUnit.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};

export const departmentCount = async (query) => {
  try {
    return await BusinessUnit.countDocuments(query);
  } catch (err) {
    throw err;
  }
};
