import { createPartFromUri, createUserContent, GoogleGenAI } from '@google/genai';
import e, { Request, Response, NextFunction } from 'express';
import { getDataSourceListWithAggregation } from '../../../database/services/common/dataSource.services';
import mongoose from 'mongoose';
import config from '../../../config';

import * as dataSourceService from '../../../database/services/common/dataSource.services';
import * as operatorService from '../../../database/services/common/operator.service';
import * as widgetTypeService from '../../../database/services/common/widgetType.service';
import { getWidgetChartData } from '../common/dashboard.controller';
import * as cacheService from '../../../database/services/reportivix/aiCache.service';
import * as fileService from '../../../database/services/common/file.services';
import { DateTime } from 'luxon';
import { handleFileUpload } from '../../../utils/gemni.helper';
import { findEntityById } from '../../../database/services/common/entity.services';
const ObjectId = mongoose.Types.ObjectId;

const genAI = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const generatePrompt = ({ collectionsMetadata, operators }) => {
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

You are an AI expert in generating MongoDB query for chart definitions based on metadata.
Here are the available collections in the system:
${formattedCollections}
Available operators by field type:
${formattedOperators}

Your task, based on the user query that we will provide in a subsequent request:
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


Note:Always use the attributes of selected collection only don't mix.
Respond strictly in the following raw JSON format (no markdown, no quotes):

{
  "collectionName": "Collection Name",
  "collectionCode":"collection Code",
  "name": "Chart Name", (Dynamically generate the chart name based on user query which is short but meaningful)
  "dimensions": "Field name for x-axis" (which you can select from Attributes of selected collection),
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

async function selectCollectionBasedOnNlQueryCache({
  collectionsMetadata,
  operators,
}: {
  collectionsMetadata: any;
  operators: any[];
}) {
  const prompt = generatePrompt({ collectionsMetadata, operators });
  const cacheResult = await genAI.caches.create({
    model: 'gemini-2.0-flash-001',
    config: {
      systemInstruction: prompt,
      ttl: '86400s',
    },
  });

  return cacheResult.name;
}

async function selectCollectionBasedOnNlQueryResultBasedOnCacheName({
  userQuery,
  cacheName,
}: {
  userQuery: string;
  cacheName: string;
}) {
  const chat = genAI.chats.create({
    model: 'gemini-2.0-flash-001',
    config: { cachedContent: cacheName },
  });

  const response = await chat.sendMessage({ message: `userQuery:${userQuery}` });

  return response.text;
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

    const cacheData = await cacheService.findCacheDataByCodeAndOrganization('chart', organizationId);
    let cacheName = '';
    const nowISO = DateTime.now().toISO();
    if (cacheData) {
      cacheName = cacheData.cacheName;
      const updateAt = cacheData.updatedAt;
      const diff = DateTime.fromISO(nowISO).diff(DateTime.fromISO(updateAt), 'seconds').seconds;

      if (diff >= 86400) {
        const query = { organizationId: new ObjectId(organizationId) };
        const collectionsMetadata = await getDataSourceListWithAggregation({
          query: query,
        });

        const operatorData = await operatorService.getAllOperators({});

        const cacheResult = await selectCollectionBasedOnNlQueryCache({
          collectionsMetadata,
          operators: operatorData.data,
        });

        await cacheService.updateCacheData(cacheData._id.toString(), { cacheName: cacheResult, updatedAt: nowISO });
        cacheName = cacheResult!;
      }
    } else {
      const query = { organizationId: new ObjectId(organizationId) };
      const collectionsMetadata = await getDataSourceListWithAggregation({
        query: query,
      });

      const operatorData = await operatorService.getAllOperators({});

      const cacheResult = await selectCollectionBasedOnNlQueryCache({
        collectionsMetadata,
        operators: operatorData.data,
      });

      cacheName = cacheResult!;

      await cacheService.createAiCacheData({
        organizationId: organizationId,
        code: 'chart',
        cacheName: cacheResult,
        createdAt: nowISO,
        updatedAt: nowISO,
      });
    }

    const queryResult = await selectCollectionBasedOnNlQueryResultBasedOnCacheName({
      userQuery,
      cacheName: cacheName,
    });

    const cleanedQueryResult = cleanModelJsonResponse(queryResult);

    if (!cleanedQueryResult || !cleanedQueryResult.collectionCode || !cleanedQueryResult.dimensions) {
      console.log(cleanedQueryResult);
      throw 'Something went wrong.Please try again.';
    } else if (cleanedQueryResult.error && cleanedQueryResult.error.length > 0) {
      console.log(cleanedQueryResult.error);
      throw cleanedQueryResult.error;
    } else {
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

      const defaultWidgetType = await widgetTypeService.getWidgetType({
        code: 'line-1',
      });

      cleanedQueryResult['widgetTypeId'] = defaultWidgetType;
      cleanedQueryResult['organizationId'] = organizationId;
      cleanedQueryResult['userQuery'] = userQuery;
      cleanedQueryResult['_id'] = Date.now();

      const widgetData = await getWidgetChartData({
        dataSourceId: cleanedQueryResult?.dataSourceId?._id,
        dimensions: cleanedQueryResult.dimensions,
        entityId: cleanedQueryResult.entityId,
        aggregation: cleanedQueryResult.aggregation,
        groupBy: cleanedQueryResult.groupBy,
        conditions: cleanedQueryResult.conditions,
        widgetType: cleanedQueryResult.widgetTypeId?.chartType,
        orgCode,
        dashBoardType: 'normal', // Add if available
        dashboardFilters: {}, // Add if available
        isIncremental: false, // Optional
      });
      cleanedQueryResult['data'] = widgetData;

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

export const runNaturalLanguageInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userQuery }: any = req.query;
    const { userId } = req.user;
    let files: any = await fileService.getAllFiles({
      query: {},
    });

    let fileData;
    if (files && files.length === 2) {
      const annuityFileData = files.find((file) => file.name === 'Annuity');
      const ipAnalystFileData = files.find((file) => file.name === 'IpAnalyst');

      if (
        !annuityFileData.uriExpiresAt ||
        !annuityFileData.fileUri ||
        new Date() > new Date(annuityFileData.uriExpiresAt) ||
        !ipAnalystFileData.uriExpiresAt ||
        !ipAnalystFileData.fileUri ||
        new Date() > new Date(ipAnalystFileData.uriExpiresAt)
      ) {
        fileData = await handleFileUpload({ userId });
      } else {
        fileData = { annuityFileData, ipAnalystFileData };
      }
    } else {
      fileData = await handleFileUpload({ userId });
    }
    const prompt = `
You are an intelligent document analysis assistant.

You are provided with two documents. Your responsibilities:

---

### Instructions:

1. Based on the **user's query**, identify the relevant document to work with. Do **not** combine both documents unless the user explicitly asks you to do so.
2. Analyze the selected document and generate a response.
3. If suitable, generate **HTML tables** to display structured data.
4. If visualization helps, include **charts or diagrams** as images using base64-encoded data URLs inside <img> tags.
5. Return your entire answer in **HTML format** using semantic tags like:
   - <h2>, <p>, <ul>, <table>, <thead>, <tbody>, <tr>, <td>, and <img src="data:image/png;base64,...">

Make sure your HTML is clean, readable, and directly usable in a modern frontend.

---

### User Query:
${userQuery}`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: createUserContent([
        createPartFromUri(fileData.ipAnalystFileData.fileUri, fileData.ipAnalystFileData.mimeType),
        createPartFromUri(fileData.annuityFileData.fileUri, fileData.annuityFileData.mimeType),
        prompt,
      ]),
    });

    res.status(200).json({
      success: true,
      message: 'Query fetched successfully.',
      data: response.text,
    });
  } catch (e) {
    next(e);
  }
};
