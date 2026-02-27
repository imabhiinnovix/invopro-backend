/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import LegalDocument from '../../models/invoicivixVendor/legalDocument';

export const createLegalDocument = async (data: any) => {
  const legalDocument = new LegalDocument(data);
  await legalDocument.save();
  return legalDocument;
};

export const findLegalDocumentById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = LegalDocument.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions =
      typeof field === 'string' ? { path: field } : field;

    query = query.populate(pop);
  });

  return await query;
};

export const updateLegalDocument = async (id: string, data: any) => {
  return await LegalDocument.findByIdAndUpdate(id, data, {
    new: true,
  });
};

export const deleteLegalDocument = async (legalDocumentId: string) => {
  return await LegalDocument.findByIdAndUpdate(
    legalDocumentId,
    { status: 'inactive' },
    { new: true } // returns updated document
  );
};

export const getLegalDocumentList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let documentQuery: any = LegalDocument.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      documentQuery = documentQuery.populate(field);
    });
  }

  const data = await documentQuery.exec();
  const totalCount = await LegalDocument.countDocuments(query);

  return { data, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await LegalDocument.findOne(query);
};