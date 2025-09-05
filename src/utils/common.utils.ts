import { Types } from 'mongoose';
const crypto = require('crypto');

export function getSchemaNameBasedOnVersionCodeAndOrgCode({
  orgCode,
  versionCode,
}: {
  orgCode: string;
  versionCode: string;
}) {
  return `data_${orgCode}_${versionCode}`;
}

export function getImportLogSchemaNameBasedOnVersionCodeAndOrgCode({
  orgCode,
  versionCode,
}: {
  orgCode: string;
  versionCode: string;
}) {
  return `data_${orgCode}_import_log_${versionCode}`;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function arraysAreEqual(a?: (string | Types.ObjectId)[], b?: (string | Types.ObjectId)[]): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  const sortedA = a.map(String).sort();
  const sortedB = b.map(String).sort();

  return sortedA.every((val, index) => val === sortedB[index]);
}

export const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


export function uniqueCode(length = 20) {
  return crypto
    .randomBytes(Math.ceil(length * 0.75)) // enough entropy for desired length
    .toString('base64')                    // convert to base64
    .replace(/[+/=]/g, '')                 // make it URL/file-name safe
    .slice(0, length);                     // trim to exact length
}


