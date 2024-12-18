export enum RoleId {
  SUPER_ADMIN = 1,
  ADMIN = 2,
  USER = 3,
}

export const RoleLabels: Record<RoleId, string> = {
  [RoleId.SUPER_ADMIN]: 'super admin',
  [RoleId.ADMIN]: 'admin',
  [RoleId.USER]: 'user',
};

export const Role = {
  Id: RoleId,
  Labels: RoleLabels,
};
