/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import Department from '../../models/common/department';
import { PopulateOptions } from 'mongoose';

export const getAllDepartments = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    let deptQuery = Department.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        deptQuery = deptQuery.populate(field);
      });
    }

    const departments = await deptQuery.exec();
    const totalCount = await Department.countDocuments(query);

    return { data: departments, totalCount };
  } catch (err) {
    throw err;
  }
};

export const createDepartment = async (deptData: any) => {
  try {
    const dept = new Department(deptData);
    await dept.save();
    return dept;
  } catch (err) {
    throw err;
  }
};

export const findDepartment = async (deptQuery, populateFields: (string | PopulateOptions)[] = []) => {
  let query = Department.find(deptQuery);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const findDepartmentById = async (id: string, populateFields: (string | PopulateOptions)[] = []) => {
  try {
    let query: any = Department.findById(id);
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    return await query;
  } catch (err) {
    throw err;
  }
};

export const updateDepartment = async (id: string, deptData: any) => {
  try {
    return await Department.findByIdAndUpdate(id, deptData, { new: true });
  } catch (err) {
    throw err;
  }
};

export const deleteDepartment = async (id: string) => {
  try {
    await Department.findByIdAndDelete(id);
  } catch (err) {
    throw err;
  }
};

export const departmentCount = async (query) => {
  try {
    return await Department.countDocuments(query);
  } catch (err) {
    throw err;
  }
};
