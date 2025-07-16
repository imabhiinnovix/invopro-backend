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
