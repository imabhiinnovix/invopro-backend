/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import Organization from '../../models/common/organization';

export const createOrganization = async (organizationData: any) => {
  try {
    const organization = new Organization(organizationData);
    await organization.save();
    return organization;
  } catch (err) {
    throw err;
  }
};

export const getOrganizationById = async (organizationId: string) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }
    return organization;
  } catch (err) {
    throw err;
  }
};

export const findOrganizationById = async (id: string, populateFields: (string | PopulateOptions)[] = []) => {
  try {
    let query: any = Organization.findById(id);

    // Normalize and apply population
    populateFields.forEach((field) => {
      const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
      query = query.populate(pop);
    });

    const organization = await query;
    return organization;
  } catch (err) {
    throw err;
  }
};
export const updateOrganization = async (organizationId: string, organizationData: any) => {
  try {
    const organization = await Organization.findByIdAndUpdate(organizationId, organizationData, { new: true });
    return organization;
  } catch (err) {
    throw err;
  }
};

export const deleteOrganization = async (organizationId: string) => {
  try {
    await Organization.findByIdAndDelete(organizationId);
  } catch (err) {
    throw err;
  }
};

export const getOrganizationList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  try {
    // Remove the await keyword here
    let usersQuery: any = Organization.find(query)
      .select(select + ' -password -isMaster')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        usersQuery = usersQuery.populate(field);
      });
    }

    // Now await the final query execution
    const organizations = await usersQuery.exec();

    const totalCount = await Organization.countDocuments(query);

    return { data: organizations, totalCount };
  } catch (err) {
    throw err;
  }
};

export const getOrganizationByUser = async (userId: string) => {
  try {
    const organizations = await Organization.find({ owner: userId });
    return organizations;
  } catch (err) {
    throw err;
  }
};
