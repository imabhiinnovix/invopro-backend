import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response, NextFunction } from 'express';
import { getDataSourceList, getDataSourceListWithAggregation } from '../../database/services/dataSource.services';
import mongoose from 'mongoose';
import config from '../../config';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import createDefaultDataSourceVersionModel from '../../database/models/defaultDataSourceVersionModel';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as dataSourceVersionService from '../../database/services/dataSourceVersion.services';
const ObjectId = mongoose.Types.ObjectId;

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const generatePrompt = ({ collectionsMetadata, userQuery }) => {
  const formattedCollections = collectionsMetadata
    .map((collection) => {
      return `
  Collection: ${collection.name} (Code: ${collection.code})
  Attributes: ${collection.attributes.map((attr) => `${attr.name} (${attr.type})`).join(', ')}
      `;
    })
    .join('\n');

  return `
  Here are the available collections in the system:
  
  ${formattedCollections}
  
  The user query is: "${userQuery}"
  
  Your task:
1. Based solely on the above list of collections and attributes, identify the **single best collection** that matches the user's intent.
   - ⚠️ Do NOT rely on previous answers or memory. Always make a fresh decision.
2. Generate a MongoDB aggregation pipeline in JavaScript format that satisfies the user query using that collection.
3. Respond strictly in the following raw JSON format (no markdown, no quotes):

{
  "name": "Collection Name", 
  "code":"collection Code",   
  "aggregation": [ /* MongoDB aggregation pipeline as an array */ ],
  "error": ""                    // Leave empty if no error, otherwise describe the issue
}

If the query is ambiguous or cannot be fulfilled with the available data, leave the aggregation empty and include an appropriate error message in the "error" field.

⚠️ Do not include any explanation or text outside the JSON response.
`;
};

async function selectCollectionBasedOnNlQuery({
  userQuery,
  collectionsMetadata,
}: {
  userQuery: string;
  collectionsMetadata: any;
}) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = generatePrompt({ collectionsMetadata, userQuery });
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

    const queryResult = await selectCollectionBasedOnNlQuery({ userQuery, collectionsMetadata });
    const cleanedQueryResult = cleanModelJsonResponse(queryResult);

    if (!cleanedQueryResult || !cleanedQueryResult.code || !cleanedQueryResult.aggregation) {
      console.log(cleanedQueryResult);
      throw 'Something went wrong.Please try again.';
    } else if (cleanedQueryResult.error && cleanedQueryResult.error.length > 0) {
      console.log(cleanedQueryResult.error);
      throw cleanedQueryResult.error;
    } else {
      const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        orgCode,
        versionCode: cleanedQueryResult.code,
      });

      const dataSource: any = await dataSourceService.getDataSource({
        code: cleanedQueryResult.code,
        organizationId: organizationId,
      });

      const dataSourceVersion: any = await dataSourceVersionService.getDataSourceVersion({
        query: {
          dataSourceId: dataSource._id,
          isCurrent: true,
          isActive: true,
        },
        sort: { versionValue: -1 },
      });

      const aggregation = cleanedQueryResult.aggregation;

      const matchStage = aggregation.find((stage) => stage.$match);
      if (matchStage) {
        matchStage.$match.dataSourceVersionId = new ObjectId(dataSourceVersion._id.toString());
      } else {
        aggregation.unshift({ $match: { dataSourceVersionId: new ObjectId(dataSourceVersion._id.toString()) } });
      }
      const DataSourceModel = createDefaultDataSourceVersionModel(schemaName);

      // 5. Execute aggregation
      const dataResults = await DataSourceModel.aggregate(aggregation).exec();
      res.status(200).json({
        success: true,
        message: 'Widget theme selected successfully',
        aggregation,
        data: dataResults,
      });
    }
  } catch (err) {
    next(err);
  }
};
