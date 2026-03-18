import { Types } from 'mongoose';

import * as dataSourceService from '../database/services/common/dataSource.services';
import * as dataSourceVersionService from '../database/services/common/dataSourceVersion.services';
import * as dataSourceVersionValueService from '../database/services/common/defaultDataSourceVersionValue.services';

import { findEntityById } from '../database/services/common/entity.services';

import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../utils/common.utils';



export const autoSyncReferenceRow = async ({
  refEntityId,
  refValue,
  refEntityField,
  row,
  mapping,
  user,
  refDataSourceDetails,
  refCache,
}: {
  refEntityId: Types.ObjectId;
  refValue: any;
  refEntityField: any;
  row: any;
  mapping: Record<string, string>;
  user: any;
  refDataSourceDetails: any;
  refCache: Map<string, any>; // key → cacheKey, value → { _id, rowData }
}) => {

  const { userId, organizationId, orgCode } = user;

  if (!refDataSourceDetails) {
    throw new Error('Reference DataSource not found');
  }

  const normalizedValue = refValue?.toString().toLowerCase().trim();
  const cacheKey = `${refEntityId}_${normalizedValue}`;

  // 🔹 schema
  const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
    orgCode,
    versionCode: refDataSourceDetails.code,
  });

  // 🔹 version (ensure current exists)
  let version = await dataSourceVersionService.getDataSourceVersion({
    query: {
      dataSourceId: refDataSourceDetails._id,
      isCurrent: true,
    },
    sort: { createdAt: -1 },
  });

  if (!version) {
    const now = new Date();
    const versionValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    version = await dataSourceVersionService.createDataSourceVersion({
      dataSourceId: refDataSourceDetails._id,
      versionValue,
      isCurrent: true,
      isActive: true,
      createdBy: userId,
      organizationId,
    });
  }

  // 🔹 entity
  const refEntity = await findEntityById(refEntityId);
  if (!refEntity || !refEntity.attributes) {
    throw new Error('Reference Entity not found');
  }

  // 🔹 build rowData
  const refRowData: Record<string, any> = {};

  for (const attr of refEntity.attributes) {
    const attrName = attr.name;
    const fileKey = mapping[attrName];

    let value: any;

    if (Array.isArray(fileKey)) {
      for (const key of fileKey) {
        const candidate = row[key];
        if (candidate !== undefined && candidate !== null && candidate !== '') {
          value = candidate;
          break;
        }
      }
    } else if (fileKey) {
      value = row[fileKey];
    }

    if (typeof value === 'object' && value != null) {
      value = value.text;
    }

    if (value !== undefined) {
      refRowData[attrName] = value;
    }
  }

  // 🔥 ensure reference field set
  refRowData[refEntityField.name] = refValue;

  // ============================================================
  // 🔥 1. CACHE HIT → UPDATE SAME RECORD (NO WRONG DB MATCH)
  // ============================================================
  if (refCache.has(cacheKey)) {
    const cached = refCache.get(cacheKey); // { _id, rowData }
    // 🔁 sum numeric fields IN MEMORY
    for (const attr of refEntity.attributes) {
      if (attr.type === 'number') {
        const field = attr.name;
        cached.rowData[field] =
          (cached.rowData[field] || 0) +
          (refRowData[field] || 0);
      }
      
    }

    return cached._id;
  }

  // ============================================================
  // 🔥 2. FIRST TIME → CREATE NEW RECORD
  // ============================================================
  // const newRow = {
  //   dataSourceId: refDataSourceDetails._id,
  //   versionValue: version.versionValue,
  //   entityId: refEntityId,
  //   dataSourceVersionId: version._id,
  //   rowData: refRowData,
  //   createdBy: userId,
  //   status: 'in-active',
  // };

  // const created =
  //   await dataSourceVersionValueService.createDataSourceVersionValue(
  //     schemaName,
  //     [newRow]
  //   );

  const created: any = await dataSourceVersionValueService.createSingleRowVersionValueService({
          dataSourceId: refDataSourceDetails._id,
          user,
          rowData: refRowData
      });
  const createdDoc = created?.[0] || {};    

  // ============================================================
  // 🔥 3. STORE FULL DOC IN CACHE
  // ============================================================
  refCache.set(cacheKey, {
    _id: createdDoc?._id,
    rowData: createdDoc?.rowData, // store copy for aggregation
    refSchemaName: schemaName, // optional (useful later)
  });

  return createdDoc._id;
};

// export async function applyAutoAggregation({
//   newRowData,
//   attributes,
//   uniqueAttributeRules,
//   attributeIdToNameMap,
// }: {
//   newRowData: any[];
//   attributes: any[];
//   uniqueAttributeRules: any[];
//   attributeIdToNameMap: Record<string, string>;
// }) {
//   const resultMap: Record<string, any> = {};

//   for (const row of newRowData) {
//     let applied = false;

//     for (const rule of uniqueAttributeRules) {
//       const keyParts: string[] = [];

//       for (const attrId of rule) {
//         const attrName = attributeIdToNameMap[attrId.toString()];
//         if (!attrName) continue;

//         const val = row.rowData[attrName];
//         if (val === undefined || val === null || val === '') continue;

//         keyParts.push(`${val}`.toLowerCase().trim());
//       }

//       const key = keyParts.join('|');
//       if (!key) continue;

//       if (!resultMap[key]) {
//         resultMap[key] = row;
//       } else {
//         // 🔥 SUM numeric fields only
//         for (const attr of attributes) {
//           if (attr.type === 'number') {
//             const field = attr.name;

//             resultMap[key].rowData[field] =
//               (resultMap[key].rowData[field] || 0) +
//               (row.rowData[field] || 0);
//           }
//         }
//       }

//       applied = true;
//       break;
//     }

//     if (!applied) {
//       const randomKey = `row_${Math.random()}`;
//       resultMap[randomKey] = row;
//     }
//   }

//   return Object.values(resultMap);
// }

// export const autoGenerateReferenceRowFromForm = async ({
//   refEntityId,
//   refValue,
//   refEntityField,
//   rowData,
//   userId,
//   organizationId,
//   orgCode,
// }: {
//   refEntityId: Types.ObjectId;
//   refValue: any;
//   refEntityField: any;
//   rowData: Record<string, any>;
//   userId: string;
//   organizationId: string;
//   orgCode: string;
// }) => {
//   // 🔹 1. Get DataSource of reference entity
//   const refDataSources = await dataSourceService.findDataSourcesByEntityId(refEntityId);
//   const refDataSource = refDataSources?.[0];

//   if (!refDataSource) {
//     throw new Error('Reference DataSource not found');
//   }

//   // 🔹 2. Get/Create version
//   let version = await dataSourceVersionService.getDataSourceVersion({
//     query: {
//       dataSourceId: refDataSource._id,
//       isCurrent: true,
//     },
//     sort: { createdAt: -1 },
//   });

//   if (!version) {
//     const now = new Date();
//     const versionValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

//     version = await dataSourceVersionService.createDataSourceVersion({
//       dataSourceId: refDataSource._id,
//       versionValue,
//       isCurrent: true,
//       isActive: true,
//       createdBy: userId,
//       organizationId,
//     });
//   }

//   // 🔹 3. Get Entity
//   const refEntity = await findEntityById(refEntityId);

//   if (!refEntity || !refEntity.attributes) {
//     throw new Error('Reference Entity not found');
//   }

//   // 🔹 4. Build rowData directly from form
//   const refRowData: Record<string, any> = {};

//   for (const attr of refEntity.attributes) {
//     const attrName = attr.name;

//     let value = rowData[attrName]; // ✅ direct mapping

//     if (typeof value === 'object' && value != null) {
//       value = value.text;
//     }

//     if (value !== undefined) {
//       refRowData[attrName] = value;
//     }
//   }

//   // 🔥 ensure main reference field always present
//   refRowData[refEntityField.name] = refValue;

//   // 🔹 5. Schema name
//   const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
//     orgCode,
//     versionCode: refDataSource.code,
//   });

//   // 🔹 6. Create row
//   const newRow = {
//     dataSourceId: refDataSource._id,
//     versionValue: version.versionValue,
//     entityId: refEntityId,
//     dataSourceVersionId: version._id,
//     rowData: refRowData,
//     createdBy: userId,
//     status: 'active',
//   };

//   const created = await dataSourceVersionValueService.createDataSourceVersionValue(
//     schemaName,
//     [newRow]
//   );

//   return created?.[0];
// };