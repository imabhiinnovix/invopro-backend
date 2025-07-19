import { Types } from 'mongoose';

export function getSchemaNameBasedOnVersionCodeAndOrgCode({
  orgCode,
  versionCode,
}: {
  orgCode: string;
  versionCode: string;
}) {
  return `data_${orgCode}_${versionCode}`;
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
