/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Schema, model, Document, Types } from 'mongoose';

interface IVendor extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;

  name: string;
  code: string;
  description?: string;

  status: string;

  // Contact / Business Info
  logo?: string;
  email?: string;
  phone?: string;
  countryISOCode?: string;
  countryDialCode?: string;
  mobile?: number;
  primaryContactName?: string;

  // Secondary Contact Info
  secondaryContactName?: string;
  secondaryContactCountryISOCode?: string;
  secondaryContactCountryDialCode?: string;
  secondaryContactMobile?: number;

  // Address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;

  // Tax
  taxId?: string;
  pan?: string;

  // Billing
  defaultCurrency: string;

  // Engagement Letter
  isEngagementLetter?: boolean;
  engagementLetterId?: Types.ObjectId | null;

  // ------------------------
  // Primary Bank Details
  // ------------------------
  bankName?: string;
  bankAddress1?: string;
  bankAddress2?: string;
  bankState?: string;
  bankCountry?: string;
  bankSwiftCode?: string;
  bankRoutingNumber?: string;
  bankAccountNumber?: string;

  beneficiaryContactName?: string;
  beneficiaryContactEmail?: string;
  bankCity?: string;
  bankZip?: string;


  // ------------------------
  // Intermediary Bank Details
  // ------------------------
  intermediaryBankName?: string;
  intermediaryBankAddress1?: string;
  intermediaryBankAddress2?: string;
  intermediaryBankSwiftCode?: string;
  intermediaryBeneficiaryAccountNumber?: string;
  intermediaryBeneficiaryContactName?: string;
  intermediaryBeneficiaryContactEmail?: string;
  intermediaryBankCountry?: string;
  intermediaryBankState?: string;
  intermediaryBankCity?: string;
  intermediaryBankZip?: string;

  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },

    name: { type: String, required: true },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: { type: String },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // Contact / Business Info
    logo: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    countryISOCode: { type: String, default: '' },
    countryDialCode: { type: String, default: '' },
    mobile: { type: Number },
    primaryContactName: { type: String, default: ''},

    // Secondary Contact Info
    secondaryContactName: { type: String, default: ''},
    secondaryContactCountryISOCode: { type: String, default: '' },
    secondaryContactCountryDialCode: { type: String, default: '' },
    secondaryContactMobile: { type: Number },

    // Address
    address1: { type: String, default: '' },
    address2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: '' },

    // Tax
    taxId: { type: String, default: '' },
    pan: { type: String, default: '' },

    // Billing
    defaultCurrency: {
      type: String,
      required: true,
      default: 'USD',
    },

    // Engagement Letter
    isEngagementLetter: {
      type: Boolean,
      default: false,
    },

    engagementLetterId: {
      type: Schema.Types.ObjectId,
      ref: 'EngagementLetter',
      default: null,
    },

    // ------------------------
    // Primary Bank Details
    // ------------------------
    bankName: { type: String, default: '' },
    bankAddress1: { type: String, default: '' },
    bankAddress2: { type: String, default: '' },
    bankState: { type: String, default: '' },
    bankCountry: { type: String, default: '' },
    bankCity: { type: String, default: '' },
    bankZip: { type: String, default: '' },
    bankSwiftCode: { type: String, default: '' },
    bankRoutingNumber: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },

    beneficiaryContactName: { type: String, default: '' },
    beneficiaryContactEmail: { type: String, default: '' },

    // ------------------------
    // Intermediary Bank Details
    // ------------------------
    intermediaryBankName: { type: String, default: '' },
    intermediaryBankAddress1: { type: String, default: '' },
    intermediaryBankAddress2: { type: String, default: '' },
    intermediaryBankSwiftCode: { type: String, default: '' },
    intermediaryBeneficiaryAccountNumber: { type: String, default: '' },
    intermediaryBeneficiaryContactName: { type: String, default: '' },
    intermediaryBeneficiaryContactEmail: { type: String, default: '' },
    intermediaryBankState: { type: String, default: '' },
    intermediaryBankCountry: { type: String, default: '' },
    intermediaryBankCity: { type: String, default: '' },
    intermediaryBankZip: { type: String, default: '' },
    
  },
  {
    timestamps: true,
  }
);

// Performance Indexes
vendorSchema.index({ organizationId: 1, name: 1 });
vendorSchema.index({ organizationId: 1, code: 1 });

const Vendor = model<IVendor>('Vendor', vendorSchema);

export default Vendor;