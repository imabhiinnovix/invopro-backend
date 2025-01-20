import { Request, Response, NextFunction } from 'express';
import { promises as fsPromises } from 'fs';
import * as dataSourceService from '../../database/services/dataSourceVersion.services';
import * as entityService from '../../database/services/entity.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';
import path from 'path';
import { getColumnNamesAndTypes } from '../../utils/excel.utils';
import { IAttribute } from '../../database/models/entity';

type NewAttribute = {
  id: number;
  name: string;
  type: string;
};

type MappingResult = {
  matchedAttributes: {
    newAttribute: NewAttribute;
    entityAttribute: IAttribute;
  }[];
  unmatchedNewAttributes: NewAttribute[];
  unmatchedEntitySettingAttributes: {
    required: IAttribute[];
    notRequired: IAttribute[];
  };
};

function mapAttributes(newAttributes: NewAttribute[], entityAttributes: IAttribute[]): MappingResult {
  const matchedAttributes: MappingResult['matchedAttributes'] = [];
  const unmatchedNewAttributes: NewAttribute[] = [];
  const unmatchedEntitySettingAttributes: {
    required: IAttribute[];
    notRequired: IAttribute[];
  } = {
    required: [],
    notRequired: [],
  };

  // Copy of entityAttributes to keep track of unmatched
  const remainingEntityAttributes = [...entityAttributes];

  // Iterate over newAttributes to find matches
  newAttributes.forEach((newAttr) => {
    const matchedIndex = remainingEntityAttributes.findIndex((entityAttr) => entityAttr.name === newAttr.name);

    if (matchedIndex !== -1) {
      matchedAttributes.push({
        newAttribute: newAttr,
        entityAttribute: remainingEntityAttributes[matchedIndex],
      });
      // Remove matched entity attribute
      remainingEntityAttributes.splice(matchedIndex, 1);
    } else {
      unmatchedNewAttributes.push(newAttr);
    }
  });

  // Categorize remaining unmatched entity attributes
  remainingEntityAttributes.forEach((entityAttr) => {
    if (entityAttr.required === 'Mandatory') {
      unmatchedEntitySettingAttributes.required.push(entityAttr);
    } else {
      unmatchedEntitySettingAttributes.notRequired.push(entityAttr);
    }
  });

  return {
    matchedAttributes,
    unmatchedNewAttributes,
    unmatchedEntitySettingAttributes,
  };
}

export async function getDataSourceVersionAttributeMapping(req: Request, res: Response, next: NextFunction) {
  try {
    const { versionName, entityId, dataSourceId, versionValue, fileType } = req.body;
    const { userId, organizationId, orgCode } = req?.user;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files!).flat();

    for (const file of files) {
      const { originalname, path: filePath, size, mimetype } = file;
      const fileName = originalname;
      const fileExtension = fileName.split('.').pop();

      const newFilePath = path.join('uploads', organizationId, userId, 'temp', fileName);
      await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
      await fsPromises.rename(filePath, newFilePath);
      if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
        const existingVersionData =
          await dataSourceService.getDataSourceVersionBasedOnDataSourceIdAndVersionValueAndVersionName(
            dataSourceId,
            versionValue,
            versionName
          );

        if (existingVersionData) {
          return res.status(400).send('Version name already exists for same data source and version value.');
        }

        const entityDetails = await entityService.findEntityById(entityId);
        const columnNameAndTypeData = await getColumnNamesAndTypes(newFilePath);

        if (!entityDetails || !entityDetails.attributes) {
          return res.status(400).send('Entity/Attribute not found.');
        }
        if (!columnNameAndTypeData || columnNameAndTypeData.length === 0) {
          return res.status(400).send('Attributes not found in the given file.');
        }

        const mappedAttributes = mapAttributes(columnNameAndTypeData, entityDetails.attributes);

        // const fileData = await readExcelFile(newFilePath);
        // const schemaName = getSchemaNameBasedOnVersionCodeAndOrgCode({
        //   orgCode,
        //   versionCode: 'Portfolios',
        // });

        // const dataSourceVersion = await dataSourceService.createDataSourceVersion({
        //   entityId,
        //   dataSourceId,
        //   versionName,
        //   versionValue,
        //   createdBy: userId,
        //   isActive: true,
        // });

        // const updatedFileData = fileData.map((item) => {
        //   return {
        //     dataSourceId: dataSourceId,
        //     entityId: entityId,
        //     dataSourceVersionId: dataSourceVersion._id,
        //     rowData: {
        //       ...item,
        //     },
        //   };
        // });

        // await createDataSourceVersionValue(schemaName, updatedFileData);
        await fsPromises.unlink(newFilePath);
        return res.status(200).json({
          success: true,
          message: 'Data added successfully',
          mappedAttributes,
        });
      } else {
        await fsPromises.unlink(newFilePath);
        throw new Error('Invalid file format');
      }
    }
  } catch (e) {
    next(e);
  }
}
