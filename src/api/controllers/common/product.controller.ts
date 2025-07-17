import { Request, Response, NextFunction } from 'express';
import * as productService from '../../../database/services/common/product.service';

export const getProductList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search }: any = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    const { data, totalCount } = await productService.getProductList({});

    res.status(200).json({
      success: true,
      message: 'Product list fetched successfully.',
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};
