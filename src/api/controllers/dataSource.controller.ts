import { Request, Response, NextFunction } from 'express';
import * as dataSourceService from '../../database/services/dataSource.services';
import * as defaultDataSourceVersion from '../../database/services/defaultDataSourceVersion.services';

export const createDataSourcce = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId, name, code, versionType, description } = req.body;
    const { organizationId, userId } = req.user;

    const dataSourceData = await dataSourceService.findDataSourceByCodeAndOrganization(code, organizationId);
    if (dataSourceData) {
      return res.status(400).json({ success: false, message: 'Data Source Option Code Already Exists' });
    }

    await defaultDataSourceVersion.createEmptyCollection(code);
    const dataSource = await dataSourceService.createDataSourcce({
      entityId,
      name,
      code,
      versionType, //enum monthly
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

export const listDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, paginate = 'false' } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

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
            select: 'name', // Specify the fields to populate
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
