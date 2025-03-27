import { Request, Response, NextFunction } from 'express';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as defaultDataSourceVersionValue from '../../database/services/defaultDataSourceVersionValue.services';
import { getSchemaNameBasedOnVersionCodeAndOrgCode } from '../../utils/common.utils';

export const createDataSourcce = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId, name, code, versionType, description } = req.body;
    const { organizationId, userId, orgCode } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByCodeAndOrganization(code, organizationId);
    if (dataSourceData) {
      return res.status(400).json({ success: false, message: 'Data Source Option Code Already Exists' });
    }

    const collectionName = getSchemaNameBasedOnVersionCodeAndOrgCode({
      orgCode,
      versionCode: code,
    });
    await defaultDataSourceVersionValue.createEmptyCollection(collectionName);
    const dataSource = await dataSourceService.createDataSourcce({
      entityId,
      name,
      code,
      versionType,
      organizationId,
      createdBy: userId,
      isActive: true,
      description,
    });
    res.status(201).json({
      success: true,
      message: 'Data Source Created Successfully',
      data: dataSource,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, versionType, description } = req.body;
    const { userId } = req.user;

    await dataSourceService.updateDataSource(req.params.dataSourceId, {
      name,
      versionType,
      updatedBy: userId,
      description,
    });
    res.status(201).json({
      success: true,
      message: 'Data Source updated Successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const checkDataSourceCodeAvailableOrNot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { organizationId, orgCode } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByCodeAndOrganization(code, organizationId);
    if (dataSourceData) {
      res.status(200).json({
        success: true,
        available: false,
        message: code,
      });
    } else {
      res.status(200).json({
        success: true,
        available: true,
        message: code,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const checkDataSourceNameAvailableOrNot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const { organizationId } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByNameAndOrganization(name, organizationId);
    if (dataSourceData) {
      res.status(200).json({
        success: true,
        available: false,
        message: name,
      });
    } else {
      res.status(200).json({
        success: true,
        available: true,
        message: name,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const listDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = false, canEditInline = false } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const { organizationId } = req.user;

    const query: any = {organizationId};
    if (search) query.name = { $regex: search, $options: 'i' };

    if (canEditInline) {
      query['canEditInline'] = true;
    }
    let result: any = {};
    if (paginate) {
      result = await dataSourceService.getDataSourceList({
        query,
        page,
        limit,
        populate: [
          {
            path: 'createdBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'updatedBy',
            select: 'firstName lastName', // Specify the fields to populate
          },
          {
            path: 'entityId',
            select: 'name attributes canEditInline', // Specify the fields to populate
          },
        ],
      });
    } else {
      result = await dataSourceService.getDataSourceList({
        query,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data Source Fetched Successfully',
      data: result.data,
      totalCount: result.totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const getDataSourceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceDetails = await dataSourceService.findDataSourceById(req.params.dataSourceId);
    res.status(200).json({
      success: true,
      message: 'Data Source Details Fetched Successfully',
      data: dataSourceDetails,
    });
  } catch (err) {
    next(err);
  }
};
