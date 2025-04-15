/* eslint-disable @typescript-eslint/no-explicit-any */
import Operator from '../models/operator';

export const create = async (data: any) => {
  try {
    const response = new Operator(data);
    await response.save();
    return response;
  } catch (error) {
    throw error;
  }
};

export const getOperatorById = async (id: string) => {
  try {
    const data = await Operator.findById(id);
    console.log({ data });

    if (!data) {
      throw new Error('Operator not found');
    }

    return data;
  } catch (err) {
    throw err;
  }
};

export const getOperator = async (query: any) => {
  try {
    const operator = await Operator.findOne(query);
    return operator;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getAllOperators = async ({ query, select = '', page, limit, sort = { createdAt: -1 }, populate }: any) => {
  try {
    let operatorQuery = Operator.find(query).select(select).sort(sort);

    if (page && limit) {
      operatorQuery = operatorQuery.skip((page - 1) * limit).limit(limit);
    }

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        operatorQuery = operatorQuery.populate(field);
      });
    }

    const operators = await operatorQuery.exec();

    const totalCount = await Operator.countDocuments(query);

    return { data: operators, totalCount };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateOperatorById = async (operatorId: string, updateData: any) => {
  try {
    const operator = await Operator.findByIdAndUpdate(operatorId, updateData, { new: true });
    return operator;
  } catch (error) {
    throw error;
  }
};
