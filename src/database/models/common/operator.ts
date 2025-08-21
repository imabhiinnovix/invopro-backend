/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import mongoose from 'mongoose';
import config from '../../../config';

// Schema for individual operator
const OperatorSchema = new mongoose.Schema({
  operatorKey: {
    type: String,
    required: true,
  },
  operatorName: {
    type: String,
    required: true,
  },
  operatorType: {
    type: String,
    required: false,
  },
  valueRequired: {
    type: Boolean,
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
});

// Single schema for all field types and their operators
const operatorModel = new mongoose.Schema({
  fieldType: {
    type: String,
    enum: config.FIELD_TYPE_ENUM,
    required: true,
  },
  operators: {
    type: [OperatorSchema], // Array of operators
    required: true,
  },
});

export default mongoose.model('operator', operatorModel);
