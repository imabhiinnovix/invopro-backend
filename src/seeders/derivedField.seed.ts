import mongoose from 'mongoose';
import { DerivedField } from '../database/models/common/derivedField';

export async function seedDerivedField({ derivedFieldMapping, entityMapping }) {
  const derivedFields: any = [];

  try {
    for (const derivedField of derivedFields) {
       const existing = await DerivedField.findOne({
        $or: [{ _id: derivedField._id }, { name: derivedField.name }],
      });

      if (!existing) {
        await DerivedField.create(derivedField);
        console.info(`Created new Derived Field: ${derivedField._id}`);
      } else {
        console.info(`Skipped existing Derived Field: ${derivedField._id}`);
      }
    }
  } catch (error) {
    console.error(`Error seeding derived fields:`, error);
  }
}
