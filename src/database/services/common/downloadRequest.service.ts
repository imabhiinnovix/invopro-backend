/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import DownloadRequest from "../../models/common/downloadRequest";

// ----------------------------------------------------
// Create a new download request
// ----------------------------------------------------
export const createDownloadRequest = async (payload: any) => {
  return await DownloadRequest.create(payload);
};

// ----------------------------------------------------
// Update multiple fields in a download request
// ----------------------------------------------------
export const updateDownloadRequest = async (
  query: Record<string, any>,
  updatedFields: Record<string, any>
) => {
  const doc = await DownloadRequest.findOneAndUpdate(
    query,
    { $set: updatedFields },
    { new: true }
  );

  if (!doc) throw new Error("Download request not found or unauthorized");

  return doc;
};

// ----------------------------------------------------
// Update ONLY status field
// ----------------------------------------------------
export const updateDownloadRequestStatus = async (
  query: Record<string, any>,
  status: string
) => {
  const doc = await DownloadRequest.findOneAndUpdate(
    query,
    { $set: { status } },
    { new: true }
  );

  if (!doc) throw new Error("Download request not found or unauthorized");

  return doc;
};

// ----------------------------------------------------
// List download requests (pagination + populate)
// Same structure as your listNotificationType
// ----------------------------------------------------
export const listDownloadRequest = async ({
  query,
  select = "",
  page = 1,
  limit = 10,
  sort = { updatedAt: -1 },
  populate,
}: {
  query: Record<string, any>;
  select?: string;
  page?: number;
  limit?: number;
  sort?: any;
  populate?: string[];
}) => {
  try {
    let reqQuery: any = DownloadRequest.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        reqQuery = reqQuery.populate(field);
      });
    }

    const data = await reqQuery.lean().exec();
    const totalCount = await DownloadRequest.countDocuments(query);

    return { data, totalCount };
  } catch (err) {
    throw err;
  }
};

// ----------------------------------------------------
// Get a single download request
// ----------------------------------------------------
export const getDownloadRequest = async (query: Record<string, any>) => {
  const doc = await DownloadRequest.findOne(query);
  if (!doc) throw new Error("Download request not found or unauthorized");
  return doc;
};