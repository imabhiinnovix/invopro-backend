import mongoose from 'mongoose';
import { DerivedField } from '../database/models/reportivix/derivedField';

export async function seedDerivedField({ derivedFieldMapping, entityMapping }) {
  const derivedFields = [
    {
      _id: derivedFieldMapping.inHouseDerivedFieldId,
      name: 'Handled By',
      entityId: entityMapping.case_list.entityId,
      persist: true,
      type: 'option',
      valueRules: [
        {
          value: 'In House',
          conditionOperator: 'OR',
          conditions: [
            {
              fieldId: entityMapping.case_list.procedureAgentNameAttributeId,
              operator: 'not_exists',
            },
            {
              fieldId: entityMapping.case_list.procedureAgentNameAttributeId,
              operator: 'match_case_insensitive_array',
              matchValues: ['geleen nl', 'bangalore ip team', 'geleen corporate pg', 'sabic ip team'],
            },
            {
              fieldId: entityMapping.case_list.localAgentNameAttributeId,
              operator: 'match_case_insensitive_array',
              matchValues: ['geleen nl', 'bangalore ip team', 'geleen corporate pg', 'sabic ip team'],
            },
          ],
        },
        {
          value: 'Outside Counsel',
          conditionOperator: 'AND',
          conditions: [
            {
              fieldId: entityMapping.case_list.procedureAgentNameAttributeId,
              operator: 'exists',
            },
            {
              fieldId: entityMapping.case_list.procedureAgentNameAttributeId,
              operator: 'not_match_case_insensitive_array',
              matchValues: ['geleen nl', 'bangalore ip team', 'geleen corporate pg', 'sabic ip team'],
            },
            {
              fieldId: entityMapping.case_list.localAgentNameAttributeId,
              operator: 'not_match_case_insensitive_array',
              matchValues: ['geleen nl', 'bangalore ip team', 'geleen corporate pg', 'sabic ip team'],
            },
          ],
        },
      ],
    },
    {
      _id: derivedFieldMapping.caseListStatusPendingDerivedFieldId,
      name: 'Case Status',
      entityId: entityMapping.case_list.entityId,
      persist: true,
      type: 'option',
      valueRules: [
        {
          value: 'Pending',
          conditionOperator: 'AND',
          conditions: [
            {
              fieldId: entityMapping.case_list.dueDateAttributeId,
              operator: 'not_exists',
            },
          ],
        },
        {
          value: 'Completed',
          conditionOperator: 'AND',
          conditions: [
            {
              fieldId: entityMapping.case_list.dueDateAttributeId,
              operator: 'exists',
            },
          ],
        },
      ],
    },
  ];

  try {
    for (const derivedField of derivedFields) {
      const existing = await DerivedField.findById(derivedField._id);

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
