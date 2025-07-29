import { GoogleGenAI } from '@google/genai';
import config from '../config';
import path from 'path';
import * as fileService from '../database/services/common/file.services';

interface FileDocument {
  _id: string;
  name: string;
  type: string;
  path?: string;
  mimeType: string;
  fileUri: string;
  uriExpiresAt: string;
  save(): Promise<FileDocument>;
}

const genAI = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

export async function handleFileUpload({ userId }: { userId: string }) {
  console.log('Inside handle file upload.');
  await fileService.deleteAllFiles();

  const disclosureFile = await genAI.files.upload({
    file: path.join('reports/sample/IP Analyst Dashboard.csv'),
    config: { mimeType: 'text/plain' },
  });

  const annuityFile = await genAI.files.upload({
    file: path.join('reports/sample/AnnuitiesDueList.csv'),
    config: { mimeType: 'text/plain' },
  });

  if (!disclosureFile?.uri || !annuityFile?.uri) {
    throw new Error('File upload failed.');
  }

  const expirationTimeDisclosure = new Date(disclosureFile.expirationTime!);
  expirationTimeDisclosure.setHours(expirationTimeDisclosure.getHours() - 1);
  const ipAnalystFileData = {
    userId,
    name: 'IpAnalyst',
    mimeType: disclosureFile.mimeType,
    type: 'csv',
    fileUri: disclosureFile.uri,
    path: disclosureFile.downloadUri,
    isDeleted: false,
    uriExpiresAt: expirationTimeDisclosure,
  };

  const expirationTimeAnnuity = new Date(annuityFile.expirationTime!);
  expirationTimeAnnuity.setHours(expirationTimeAnnuity.getHours() - 1);
  const annuityFileData = {
    userId,
    name: 'Annuity',
    mimeType: annuityFile.mimeType,
    type: 'csv',
    fileUri: annuityFile.uri,
    path: annuityFile.downloadUri,
    isDeleted: false,
    uriExpiresAt: expirationTimeAnnuity,
  };

  await fileService.createManyFiles([ipAnalystFileData, annuityFileData]);
  return { annuityFileData, ipAnalystFileData };
}
