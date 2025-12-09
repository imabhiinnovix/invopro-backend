/* @ts-nocheck */

import { OrganizationVisibilitySetting } from "../../models/common/organizationVisibilitySetting";

export const createVisibilitySettingService = async (payload: any) => {
  return OrganizationVisibilitySetting.create(payload);
};

export const updateVisibilitySettingService = async (settingId: string, payload: any) => {
  return OrganizationVisibilitySetting.findByIdAndUpdate(settingId, payload, { new: true });
};

export const deleteVisibilitySettingService = async (settingId: string, organizationId?: string) => {
  if (organizationId) {
    return OrganizationVisibilitySetting.findOneAndDelete({ _id: settingId, organizationId });
  }
  return OrganizationVisibilitySetting.findByIdAndDelete(settingId);
};

export const listVisibilitySettingService = async (organizationId: string) => {
  return OrganizationVisibilitySetting.find({ organizationId }).lean();
};

export const getVisibilitySettingService = async (organizationId: string) => {
  return OrganizationVisibilitySetting.findOne({ organizationId }).lean();
};