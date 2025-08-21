/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

/* eslint-disable @typescript-eslint/no-explicit-any */

import File from '../../models/common/file';

export const createFile = async (fileData: any) => {
  try {
    const file = new File(fileData);
    await file.save();
    return file;
  } catch (err) {
    throw err;
  }
};

export const getAllFiles = async ({ query, select = '', sort = {} }: any) => {
  try {
    const files = await File.find(query).select(select).sort(sort);
    return files;
  } catch (err) {
    throw err;
  }
};

export const deleteAllFiles = async () => {
  try {
    await File.deleteMany({});
  } catch (err) {
    throw err;
  }
};

export const createManyFiles = async (fileDataArray: any[]) => {
  try {
    const files = await File.insertMany(fileDataArray);
    return files;
  } catch (err) {
    throw err;
  }
};
