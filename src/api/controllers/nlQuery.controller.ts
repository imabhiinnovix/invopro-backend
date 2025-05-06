import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response, NextFunction } from 'express';
import { getDataSourceList, getDataSourceListWithAggregation } from '../../database/services/dataSource.services';
import mongoose from 'mongoose';
import config from '../../config';
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
1. Identify which collection the query refers to.
2. Generate a MongoDB aggregation pipeline in JavaScript format that satisfies the user query.
3. Respond strictly in the following JSON format:

{
  "code": "collection_code",     // e.g., "disclosure" or "portfolio etc"
  "name": "Collection Name",     // e.g., "Disclosure" or "Portfolio etc"
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
    console.error('Failed to clean and parse model response:', err.message);
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

    const finalResult = await selectCollectionBasedOnNlQuery({ userQuery, collectionsMetadata });
    res.status(200).json({
      success: true,
      message: 'Widget theme selected successfully',
      data: cleanModelJsonResponse(finalResult),
    });
  } catch (err) {
    next(err);
  }
};
