import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response, NextFunction } from 'express';
import { getDataSourceList, getDataSourceListWithAggregation } from '../../database/services/dataSource.services';
import mongoose from 'mongoose';
import config from '../../config';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../database/models/defaultDataSourceVersionModel';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
import * as operatorService from '../../database/services/operator.service';
const ObjectId = mongoose.Types.ObjectId;

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// const generatePrompt = ({ collectionsMetadata, userQuery, operators }) => {
//   const formattedCollections = collectionsMetadata
//     .map((collection) => {
//       return `
//   Collection: ${collection.name} (Code: ${collection.code})
//   Attributes: ${collection.attributes.map((attr) => `rowData.${attr.name} (${attr.type})`).join(', ')}
//       `;
//     })
//     .join('\n');

//   return `
//   Here are the available collections in the system:

//   ${formattedCollections}

//   The user query is: "${userQuery}"

//   Your task:
// 1. Based solely on the above list of collections and attributes, identify the **single best collection** that matches the user's intent.
//    - ⚠️ Do NOT rely on previous answers or memory. Always make a fresh decision.
// 2. Generate a MongoDB aggregation pipeline in JavaScript format that satisfies the user query using that collection.
// 3. Respond strictly in the following raw JSON format (no markdown, no quotes):

// {
// "name": "Collection Name",
// "code":"collection Code",
//   "aggregation": [ /* MongoDB aggregation pipeline as an array */ ],
//   "error": ""                    // Leave empty if no error, otherwise describe the issue
// }

// If the query is ambiguous or cannot be fulfilled with the available data, leave the aggregation empty and include an appropriate error message in the "error" field.

// ⚠️ Do not include any explanation or text outside the JSON response.
// `;
// };

const generatePrompt = ({ collectionsMetadata, userQuery, operators }) => {
  const formattedCollections = collectionsMetadata
    .map((collection) => {
      return `
Collection: ${collection.name} (Code: ${collection.code})
Attributes: ${collection.attributes.map((attr) => `${attr.name} (${attr.type})`).join(', ')}
      `;
    })
    .join('\n');

  const formattedOperators = operators
    .map((opGroup) => {
      return `Field Type: ${opGroup.fieldType}
Operators: ${opGroup.operators.map((op) => `${op.operatorKey}`).join(', ')}`;
    })
    .join('\n\n');

  return `
Here are the available collections in the system:

${formattedCollections}

Available operators by field type:

${formattedOperators}

The user query is: "${userQuery}"

Your task:
1. Based solely on the above list of collections and attributes, identify the **single best collection** that matches the user's intent (Identify based on Collection and Attributes).
   - ⚠️ Do NOT rely on previous answers or memory. Always make a fresh decision.
2. Generate a chart definition object that includes:
   - "name": chart title,(Dynamically generate the chart name based on user query which is short but meaningful)
   - "dimensions": the field used for x-axis(type:string only one field it is mandatory) (which you can select from Attributes) ,
   - "groupBy": (optional) field used for grouping data(type:string only one field) (which you can select from Attributes) note:groupby field should not be same as dimension field,
   - "aggregation": {
        "type": one of ["Count", "Sum", "Average"],
        "attributeName": the field to apply aggregation on (which you can select from Attributes)
     },
   - "conditions": array of filter conditions (refer to Operators).

⚠️ IMPORTANT: This JSON format will be used elsewhere in the system to **dynamically generate MongoDB queries**. Ensure accuracy and strict adherence to the structure.

Respond strictly in the following raw JSON format (no markdown, no quotes):

{
  "collectionName": "Collection Name",
  "collectionCode":"collection Code",
  "name": "Chart Name", (Dynamically generate the chart name based on user query which is short but meaningful)
  "dimensions": "Field name for x-axis" (which you can select from Attributes for selected collection),
  "groupBy": "Optional group by field" (which you can select from Attributes for selected collection)note:groupby field should not be same as dimension field ,
  "aggregation": {
    "type": "Aggregation type" choose one of ["Count", "Sum", "Average"],
    "attributeName": "Field for aggregation (which you can select from Attributes for selected collection)"
  },
  "conditions": [
    {
      "field": "Field name (which you can select from Attributes for selected collection)",
      "operator": "operatorKey (refer to Operators)",
      "value": "Value if required"
    }
  ],
  "error": ""
}

If the query is ambiguous or cannot be fulfilled with the available data, leave all fields empty and include an appropriate error message in the "error" field.

⚠️ Do not include any explanation or text outside the JSON response.
`;
};

async function selectCollectionBasedOnNlQuery({
  userQuery,
  collectionsMetadata,
  operators,
}: {
  userQuery: string;
  collectionsMetadata: any;
  operators: any[];
}) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = generatePrompt({ collectionsMetadata, userQuery, operators });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function cleanModelJsonResponse(response) {
  try {
    // Remove markdown fences if present
    let cleaned = response
      .trim()
      .replace(/^```(?:json)?/, '')
      .replace(/```$/, '')
      .trim();

    // If it's still a stringified JSON (with \" and \n), parse it twice
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = JSON.parse(cleaned); // First parse removes string escapes
    }

    return JSON.parse(cleaned); // Final parse gives usable object
  } catch (err) {
    console.error('Failed to clean and parse model response:', err);
    return {
      code: '',
      name: '',
      aggregation: [],
      error: 'Could not parse model response as valid JSON.',
    };
  }
}

export const runNaturalLanguageAggregation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, orgCode } = req.user;
    const { userQuery }: any = req.query;
    const query = { organizationId: new ObjectId(organizationId) };

    const collectionsMetadata = await getDataSourceListWithAggregation({
      query: query,
    });

    const operatorData = await operatorService.getAllOperators({});
    const queryResult = await selectCollectionBasedOnNlQuery({
      userQuery,
      collectionsMetadata,
      operators: operatorData.data,
    });
    const cleanedQueryResult = cleanModelJsonResponse(queryResult);

    if (!cleanedQueryResult || !cleanedQueryResult.collectionCode || !cleanedQueryResult.dimensions) {
      console.log(cleanedQueryResult);
      throw 'Something went wrong.Please try again.';
    } else if (cleanedQueryResult.error && cleanedQueryResult.error.length > 0) {
      console.log(cleanedQueryResult.error);
      throw cleanedQueryResult.error;
    } else {
      // const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      //   orgCode,
      //   versionCode: cleanedQueryResult.code,
      // });

      const dataSource: any = await dataSourceService.getDataSource({
        code: cleanedQueryResult.collectionCode,
        organizationId: organizationId,
      });

      cleanedQueryResult['dataSourceId'] = { _id: dataSource._id, name: dataSource.name, code: dataSource.code };
      cleanedQueryResult['entityId'] = dataSource.entityId;
      if (!Array.isArray(cleanedQueryResult['dimensions'])) {
        cleanedQueryResult['dimensions'] = [cleanedQueryResult['dimensions']];
      }

      if (!Array.isArray(cleanedQueryResult['groupBy'])) {
        cleanedQueryResult['groupBy'] = cleanedQueryResult['groupBy'] ? [cleanedQueryResult['groupBy']] : [];
      }
      // const dataSourceVersion: any = await dataSourceVersionService.getDataSourceVersion({
      //   query: {
      //     dataSourceId: dataSource._id,
      //     isCurrent: true,
      //     isActive: true,
      //   },
      //   sort: { versionValue: -1 },
      // });

      // const aggregation = cleanedQueryResult.aggregation;

      // const matchStage = aggregation.find((stage) => stage.$match);
      // if (matchStage) {
      //   matchStage.$match.dataSourceVersionId = new ObjectId(dataSourceVersion._id.toString());
      // } else {
      //   aggregation.unshift({ $match: { dataSourceVersionId: new ObjectId(dataSourceVersion._id.toString()) } });
      // }
      // const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

      // // 5. Execute aggregation
      // const dataResults = await DataSourceModel.aggregate(aggregation).exec();

      res.status(200).json({
        success: true,
        message: 'Query fetched successfully.',
        data: cleanedQueryResult,
      });
    }
  } catch (err) {
    next(err);
  }
};
