/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import mongoose from 'mongoose';

import config from '../config';
import { seedUsers } from './user.seed';
import { seedOrganizations } from './organization.seed';
// import { seedCustomReports } from './customReport.seed';
// import path from 'path';
import { seedChart } from './widget_Type_chart.seed';
import { seedOperators } from './operators.seed';
import { seedWidgetTheme } from './widgetTheme.seed';
// import { seedDashboardWidget } from './dashboardWidget.seed';
import { seedDashboard } from './dashboard.seed';
import { seedEntities } from './entities.seed';
import { seedDataSource } from './dataSource.seed';
import { seedCustomReports } from './customReport.seed';
import { seedProducts } from './product.seed';
import { seedRolesAndPermissions } from './seedRoleAndPermission';
import { seedPermissions } from './permission.seed';
import { createProductSubscription } from './organizationHasProduct.seed';
import { seedDashboardsForOrganization } from './userLevelDashboard.seed';
import { seedAttributeOptions } from './attibuteOptionSeed';
import { seedDerivedField } from './derivedField.seed';

const payload = {
  reportivixSuperAdminUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e312'),
  reportivixAdminUserId: new mongoose.Types.ObjectId('64d229e76e4d3f1d2f9f3e8c'),
  reportivixTestUserId: new mongoose.Types.ObjectId('66b34cbbd40e24fca2e3e360'),

  sabicAdminUserId: new mongoose.Types.ObjectId('67caac8cc4f70d4fdbdb7299'),
  mahuaAdminUserId: new mongoose.Types.ObjectId('67cb46f5fd7215371ed92173'),
  //organization
  reportivixOrganizationId: new mongoose.Types.ObjectId('66de96d3548d06560e2931cb'),
  sabicOrganizationId: new mongoose.Types.ObjectId('67caac1ec4f70d4fdbdb7294'),

  reportivixProductId: new mongoose.Types.ObjectId('6870c9e335f4e90221de9ece'),
  notivixProductId: new mongoose.Types.ObjectId('6870c9e335f4e90221de9ed1'),

  pieChartId: new mongoose.Types.ObjectId('67e5011c966d261de673d1f1'),
  lineChartId: new mongoose.Types.ObjectId('67e68fd541db187651d5e6b8'),
  areaChartId: new mongoose.Types.ObjectId('67f3a9f7a3668434210f2e18'),
  numberChartId: new mongoose.Types.ObjectId('67f3a9f7a3668434210f2e1b'),
  horizontalBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7ba6'),
  verticalBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7ba9'),
  stackedBarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bac'),
  bubbleChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7baf'),
  doughnutChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb2'),
  multiSeriesPieChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb5'),
  polarAreaChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bb8'),
  radarChartId: new mongoose.Types.ObjectId('67f75909ecc4ad15736f7bbb'),
  scatterChartId: new mongoose.Types.ObjectId('67f75cd8b28822189f7ae71c'),
  tabularChartId: new mongoose.Types.ObjectId('67f75cd8b28822189f7ae71d'),
  stackedBarLineId: new mongoose.Types.ObjectId('68cd5d2a33e110208844cfc8'),
  comboBarLineId: new mongoose.Types.ObjectId('68cd5d2a33e110208844cfcb'),
  widgetThemeId: new mongoose.Types.ObjectId('67f783d7d2001cac19c75961'),
};

const entityDataSourceMapReportivix = {
  disclosure: {
    entityId: new mongoose.Types.ObjectId('679232f9753ceb4945e5b3a5'),
    dataSourceId: new mongoose.Types.ObjectId('6792332a753ceb4945e5b3b8'),
  },
  portfolio: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('67923590d31b8f4ea211147b'),
  },
  sabicip: {
    entityId: new mongoose.Types.ObjectId('67a3225421f5f8dd752ce62f'),
    dataSourceId: new mongoose.Types.ObjectId('67a3226221f5f8dd752ce644'),
  },
  ctclinsab: {
    entityId: new mongoose.Types.ObjectId('67a33c7222cb8a927a85e410'),
    dataSourceId: new mongoose.Types.ObjectId('67a33c7f22cb8a927a85e427'),
  },
  annuities: {
    entityId: new mongoose.Types.ObjectId('67a3428622cb8a927a85e4a4'),
    dataSourceId: new mongoose.Types.ObjectId('67a3429322cb8a927a85e4b9'),
  },
  sabiccontracts: {
    entityId: new mongoose.Types.ObjectId('67b30f0982247f52c59f38c0'),
    dataSourceId: new mongoose.Types.ObjectId('67c6d4eb9fb857c9aaf5319c'),
  },
  shppcontracts: {
    entityId: new mongoose.Types.ObjectId('67b4209ceb71879e5fa1e07e'),
    dataSourceId: new mongoose.Types.ObjectId('67c6d4fd9fb857c9aaf531b1'),
  },
  ksacontracts: {
    entityId: new mongoose.Types.ObjectId('67b4452b67ea5efd4f79e659'),
    dataSourceId: new mongoose.Types.ObjectId('67c6d50e9fb857c9aaf531c6'),
  },
  attorneymapping: {
    entityId: new mongoose.Types.ObjectId('67b4488a67ea5efd4f79e666'),
    dataSourceId: new mongoose.Types.ObjectId('67c6d5279fb857c9aaf531db'),
  },
  agreementtypemapping: {
    entityId: new mongoose.Types.ObjectId('67b448f967ea5efd4f79e671'),
    dataSourceId: new mongoose.Types.ObjectId('67c6d5499fb857c9aaf531f0'),
  },
  ipanalystdashboard: {
    entityId: new mongoose.Types.ObjectId('67b44ba567ea5efd4f79e682'),
    dataSourceId: new mongoose.Types.ObjectId('67c6e4ba44cef11611823e70'),
  },
  shppaccolade: {
    entityId: new mongoose.Types.ObjectId('67c6e13e44cef11611823e28'),
    dataSourceId: new mongoose.Types.ObjectId('67c6e4f144cef11611823e8a'),
  },
  sabicaccolade: {
    entityId: new mongoose.Types.ObjectId('67c6e11744cef11611823e17'),
    dataSourceId: new mongoose.Types.ObjectId('67c6e50a44cef11611823e9e'),
  },
  newfilings: {
    entityId: new mongoose.Types.ObjectId('67d8d993b327f8f92cce5f22'),
    dataSourceId: new mongoose.Types.ObjectId('67d8d9f7b327f8f92cce5f48'),
  },
  estimates: {
    entityId: new mongoose.Types.ObjectId('67d8d9c9b327f8f92cce5f2e'),
    dataSourceId: new mongoose.Types.ObjectId('67d8da0cb327f8f92cce5f5c'),
  },
  projectsopened: {
    entityId: new mongoose.Types.ObjectId('67dac48f7d55c5d9d00417c9'),
    dataSourceId: new mongoose.Types.ObjectId('67dac4b17d55c5d9d00417e5'),
  },
  monthlyipglobal: {
    entityId: new mongoose.Types.ObjectId('67fcfdb0b127d9456c7c6c11'),
    dataSourceId: new mongoose.Types.ObjectId('67fd0309b127d9456c7c6c44'),
  },
  monthlyipstc: {
    entityId: new mongoose.Types.ObjectId('67fcff64b127d9456c7c6c21'),
    dataSourceId: new mongoose.Types.ObjectId('67fd01a5b127d9456c7c6c2f'),
  },
  monthlyipstcsbu: {
    entityId: new mongoose.Types.ObjectId('680b63c114c2fd3bb0972817'),
    dataSourceId: new mongoose.Types.ObjectId('680b640114c2fd3bb097283f'),
  },
  supplementalipagreementsfinalagreementtype: {
    entityId: new mongoose.Types.ObjectId('680db3102e9c639d271dbf11'),
    dataSourceId: new mongoose.Types.ObjectId('680dbc262e9c639d271dbf9d'),
  },
  supplementalipagreementsothers: {
    entityId: new mongoose.Types.ObjectId('680db438556f85595924ae0d'),
    dataSourceId: new mongoose.Types.ObjectId('680dbc422e9c639d271dbfb2'),
  },
  supplementalipbangaloreipgroupcurrentstatus: {
    entityId: new mongoose.Types.ObjectId('680db5022e9c639d271dbf32'),
    dataSourceId: new mongoose.Types.ObjectId('680dbc582e9c639d271dbfc3'),
  },
  supplementalipbangaloreipgroupsbu: {
    entityId: new mongoose.Types.ObjectId('680db585556f85595924ae0f'),
    dataSourceId: new mongoose.Types.ObjectId('680dbc7b2e9c639d271dbfd4'),
  },
  supplementalipbangaloreipgroupworkscope: {
    entityId: new mongoose.Types.ObjectId('680db5c4556f85595924ae12'),
    dataSourceId: new mongoose.Types.ObjectId('680dbc8d2e9c639d271dbfe5'),
  },
  supplementalipbangaloreipgroupworkproduct: {
    entityId: new mongoose.Types.ObjectId('680db5f4556f85595924ae15'),
    dataSourceId: new mongoose.Types.ObjectId('680dbca42e9c639d271dbff6'),
  },
  supplementalipaccolademappingsheet: {
    entityId: new mongoose.Types.ObjectId('680db92e2e9c639d271dbf45'),
    dataSourceId: new mongoose.Types.ObjectId('680dbcb12e9c639d271dc007'),
  },
  supplementalippatentvaluecoverageactive: {
    entityId: new mongoose.Types.ObjectId('680dba6c2e9c639d271dbf4c'),
    dataSourceId: new mongoose.Types.ObjectId('680dbcc02e9c639d271dc018'),
  },
  patentvaluecoveragenew: {
    entityId: new mongoose.Types.ObjectId('680dbb422e9c639d271dbf63'),
    dataSourceId: new mongoose.Types.ObjectId('680dbccf2e9c639d271dc029'),
  },
  supplementalipstrategicreportingclass: {
    entityId: new mongoose.Types.ObjectId('680dbb982e9c639d271dbf6d'),
    dataSourceId: new mongoose.Types.ObjectId('680dbce12e9c639d271dc03a'),
  },
  supplementalipnewcoverage: {
    entityId: new mongoose.Types.ObjectId('680dbbf12e9c639d271dbf77'),
    dataSourceId: new mongoose.Types.ObjectId('680dbd042e9c639d271dc04b'),
  },
  intermediatemonthlyipcurrentyearnewappfiled: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('683575dcfd604f890f263325'),
  },
  pctcyinvdisclosurescnvtfilingd: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('683e6eae336975e9f711e9fd'),
  },
  pctcyinvdisclosurescnvtfilingi: {
    entityId: new mongoose.Types.ObjectId('679232f9753ceb4945e5b3a5'),
    dataSourceId: new mongoose.Types.ObjectId('683e6ec3336975e9f711ea0f'),
  },
  pctcyinvdisclosurescnvtfilingt: {
    entityId: new mongoose.Types.ObjectId('679232f9753ceb4945e5b3a5'),
    dataSourceId: new mongoose.Types.ObjectId('683e6ed7336975e9f711ea21'),
  },
  intermediatemonthlyipappsbeingdrafted: {
    entityId: new mongoose.Types.ObjectId('679232f9753ceb4945e5b3a5'),
    dataSourceId: new mongoose.Types.ObjectId('683eb1a86deb4721418017ea'),
  },
  monthlyip_projects_opened_cy: {
    entityId: new mongoose.Types.ObjectId('679232f9753ceb4945e5b3a5'),
    dataSourceId: new mongoose.Types.ObjectId('6840fd3e0ef4e301481fb2f1'),
  },
  monthlyip_total_active_projects: {
    entityId: new mongoose.Types.ObjectId('679232f9753ceb4945e5b3a5'),
    dataSourceId: new mongoose.Types.ObjectId('6840fdf20ef4e301481fb33c'),
  },
  monthlyip_cy_us_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('68410d0dc1ac3b9dc12593f2'),
  },
  monthlyip_cy_intl_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('68410d44c1ac3b9dc125943a'),
  },
  total_us_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841330e971865be2007836b'),
  },
  total_ep_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('68413345971865be200783a9'),
  },
  total_cn_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841337e971865be200783ed'),
  },
  other_country_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('684133ac971865be20078431'),
  },
  total_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('684133e5971865be20078498'),
  },
  total_us_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841aa0324ef304e9b6b2c4d'),
  },
  total_ep_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841aa4424ef304e9b6b2ca3'),
  },
  total_cn_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841aa8224ef304e9b6b2cee'),
  },
  other_country_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841aac924ef304e9b6b2d31'),
  },
  total_issued: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841ab7224ef304e9b6b2d8d'),
  },
  cy_renewals_due: {
    entityId: new mongoose.Types.ObjectId('6841cdafe5af6490b2f41197'),
    dataSourceId: new mongoose.Types.ObjectId('6841cddee5af6490b2f411d1'),
  },
  annuity_drop: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841d6f1c12805aa88cd6204'),
  },
  priority_drop: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841d72ac12805aa88cd624d'),
  },
  pct_drop: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841d756c12805aa88cd6294'),
  },
  prosecution_drop: {
    entityId: new mongoose.Types.ObjectId('67923579d31b8f4ea2111464'),
    dataSourceId: new mongoose.Types.ObjectId('6841d780c12805aa88cd62da'),
  },
  cy_annuity_savings: {
    entityId: new mongoose.Types.ObjectId('6841e260b47f76d5abdd004a'),
    dataSourceId: new mongoose.Types.ObjectId('6841e2bfb47f76d5abdd00cf'),
  },
  ny_annuity_savings: {
    entityId: new mongoose.Types.ObjectId('6841e260b47f76d5abdd004a'),
    dataSourceId: new mongoose.Types.ObjectId('6841e2e3b47f76d5abdd00f7'),
  },
  prosecution_savings: {
    entityId: new mongoose.Types.ObjectId('684250f2cf88c3e8592aee61'),
    dataSourceId: new mongoose.Types.ObjectId('6842510fcf88c3e8592aee97'),
  },
  annuities_outstanding: {
    entityId: new mongoose.Types.ObjectId('67a3428622cb8a927a85e4a4'),
    dataSourceId: new mongoose.Types.ObjectId('6846791aa0e6c029f6d08bed'),
  },
  case_list: {
    entityId: new mongoose.Types.ObjectId('6877d4c5db2c6e01d9a86cae'),
    dataSourceId: new mongoose.Types.ObjectId('6878fab8a1dfb7e7aabb0f00'),
    caseNumberAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c34'),
    otherReferenceNumberAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c35'),
    titleAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c36'),
    statusAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c37'),
    actionDueAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c38'),
    dueDateAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c39'),
    dateTakenAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c3a'),
    remarksAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c3b'),
    attorneyAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c3c'),
    legalAssistantAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c3d'),
    assignedToAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c3e'),
    procedureAgentNameAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c3f'),
    localAgentNameAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c40'),
    sbuAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c41'),
    buAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c42'),
    blAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c43'),
    countryAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c44'),
    caseTypeAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c45'),
    activeSwitchAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4c46'),
    disclosureAttributeId: new mongoose.Types.ObjectId('68b01d62dda97879b399ede0'),
  },
  action_due: {
    entityId: new mongoose.Types.ObjectId('6877cd611e202b200594b36e'),
    dataSourceId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d4b'),
    actionDueAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7ed'),
    stdActionsAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7ee'),
    actionCategoryAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7ef'),
    alertRequiredAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7f0'),
    reportCriticalEventAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7f1'),
    reportPersonalSchedulerAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7f2'),
    reportActionsDueAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7f3'),
    excludedAttributeId: new mongoose.Types.ObjectId('68889f1440e7e5582836a7f4'),
  },
  attorney_fo_mapping: {
    entityId: new mongoose.Types.ObjectId('68a726f696481808fce1aede'),
    dataSourceId: new mongoose.Types.ObjectId('68a729e596481808fce1b233'),
    foNameAttributeId: new mongoose.Types.ObjectId('68a726f696481808fce1aee0'),
    attorneyNameAttributeId: new mongoose.Types.ObjectId('68a726f696481808fce1aedf'),
  },
  formality_officers: {
    entityId: new mongoose.Types.ObjectId('687a295c7245e607088f68b0'),
    dataSourceId: new mongoose.Types.ObjectId('687a2a5e7245e607088f695b'),
    foNameAttributeId: new mongoose.Types.ObjectId('689ee486e35b2b9634d729d3'),
    foEmailAttributeId: new mongoose.Types.ObjectId('689ee486e35b2b9634d729d4'),
    escalation1AttributeId: new mongoose.Types.ObjectId('689ee486e35b2b9634d729d5'),
    escalation1EmailIDAttributeId: new mongoose.Types.ObjectId('689ee486e35b2b9634d729d6'),
    escalation2AttributeId: new mongoose.Types.ObjectId('689ee486e35b2b9634d729d7'),
    escalation2EmailIDAttributeId: new mongoose.Types.ObjectId('689ee486e35b2b9634d729d8'),
  },
  ip_counsel: {
    entityId: new mongoose.Types.ObjectId('687a29fb7245e607088f6900'),
    dataSourceId: new mongoose.Types.ObjectId('687a2a367245e607088f693b'),
    attorneyNameAttributeId: new mongoose.Types.ObjectId('68a70ab921450a2ddaeadd01'),
    emailAttributeId: new mongoose.Types.ObjectId('68ac02abd6e377def33ee296'),
  },
};

const customReportMapReportivix = {
  monthlyip: {
    reportId: new mongoose.Types.ObjectId('67c6b1170188609951659440'),
    intermediateReportId: new mongoose.Types.ObjectId('683588c4d8459308307d05d0'),
  },
  intermediatemonthlyip: {
    reportId: new mongoose.Types.ObjectId('683588c4d8459308307d05d0'),
  },
  supplementalip: {
    reportId: new mongoose.Types.ObjectId('67c7fa3493d10de5c51ae7c1'),
  },
};

const entityDataSourceMapSabic = {
  disclosure: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b4'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1c9'),
  },
  portfolio: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1ca'),
  },
  sabicip: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b6'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1cb'),
  },
  ctclinsab: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b7'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1cc'),
  },
  annuities: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b8'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1cd'),
  },
  sabiccontracts: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b9'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1ce'),
  },
  shppcontracts: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1ba'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1cf'),
  },
  ksacontracts: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1bb'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1d0'),
  },
  attorneymapping: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1bc'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1d1'),
  },
  agreementtypemapping: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1bd'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1d2'),
  },
  ipanalystdashboard: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1be'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1d3'),
  },
  shppaccolade: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1c0'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1d4'),
  },
  sabicaccolade: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1bf'),
    dataSourceId: new mongoose.Types.ObjectId('67cab7a2598bffd31565e1d5'),
  },
  newfilings: {
    entityId: new mongoose.Types.ObjectId('67dcfd75a80fbc2659345173'),
    dataSourceId: new mongoose.Types.ObjectId('67dd0040a80fbc265934517a'),
  },
  estimates: {
    entityId: new mongoose.Types.ObjectId('67dcfd75a80fbc2659345174'),
    dataSourceId: new mongoose.Types.ObjectId('67dd0040a80fbc265934517b'),
  },
  projectsopened: {
    entityId: new mongoose.Types.ObjectId('67dcfd75a80fbc2659345175'),
    dataSourceId: new mongoose.Types.ObjectId('67dd0040a80fbc265934517c'),
  },
  monthlyipstc: {
    entityId: new mongoose.Types.ObjectId('67fcff74b127d9456c7c6c23'),
    dataSourceId: new mongoose.Types.ObjectId('67fd01f6b127d9456c7c6c31'),
  },
  monthlyipglobal: {
    entityId: new mongoose.Types.ObjectId('67fcfdf3b127d9456c7c6c13'),
    dataSourceId: new mongoose.Types.ObjectId('67fd047ab127d9456c7c6c4f'),
  },
  monthlyipstcsbu: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb7a'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb8b'),
  },
  supplementalipagreementsfinalagreementtype: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb7b'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb8c'),
  },
  supplementalipagreementsothers: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb7c'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb8d'),
  },
  supplementalipbangaloreipgroupcurrentstatus: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb7d'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb8e'),
  },
  supplementalipbangaloreipgroupsbu: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb7e'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb8f'),
  },
  supplementalipbangaloreipgroupworkscope: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb7f'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb90'),
  },
  supplementalipbangaloreipgroupworkproduct: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb80'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb91'),
  },
  supplementalipaccolademappingsheet: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb81'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb92'),
  },
  supplementalippatentvaluecoverageactive: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb82'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb93'),
  },
  patentvaluecoveragenew: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb83'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb94'),
  },
  supplementalipstrategicreportingclass: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb84'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb95'),
  },
  supplementalipnewcoverage: {
    entityId: new mongoose.Types.ObjectId('6810c14f80b5a97f62abdb85'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb96'),
  },
  intermediatemonthlyipcurrentyearnewappfiled: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb97'),
  },
  pctcyinvdisclosurescnvtfilingd: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb98'),
  },
  pctcyinvdisclosurescnvtfilingi: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b4'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abdb99'),
  },
  pctcyinvdisclosurescnvtfilingt: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b4'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda10'),
  },
  intermediatemonthlyipappsbeingdrafted: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b4'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda11'),
  },
  monthlyip_projects_opened_cy: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b4'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda12'),
  },
  monthlyip_total_active_projects: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b4'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda13'),
  },
  monthlyip_cy_us_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda14'),
  },
  monthlyip_cy_intl_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda15'),
  },
  total_us_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda16'),
  },
  total_ep_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda17'),
  },
  total_cn_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda18'),
  },
  other_country_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda19'),
  },
  total_apps_pending: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda20'),
  },
  total_us_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda21'),
  },
  total_ep_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda22'),
  },
  total_cn_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda23'),
  },
  other_country_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda24'),
  },
  total_issued: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda25'),
  },
  //
  cy_renewals_due: {
    entityId: new mongoose.Types.ObjectId('6841e260b47f76d5abdd0040'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda26'),
  },
  annuity_drop: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda27'),
  },
  priority_drop: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda28'),
  },
  pct_drop: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda29'),
  },
  prosecution_drop: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b5'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda30'),
  },
  cy_annuity_savings: {
    entityId: new mongoose.Types.ObjectId('6841e260b47f76d5abdd0041'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda31'),
  },
  ny_annuity_savings: {
    entityId: new mongoose.Types.ObjectId('6841e260b47f76d5abdd0041'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda32'),
  },
  prosecution_savings: {
    entityId: new mongoose.Types.ObjectId('6841e260b47f76d5abdd0042'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda33'),
  },
  annuities_outstanding: {
    entityId: new mongoose.Types.ObjectId('67caaf4d598bffd31565e1b8'),
    dataSourceId: new mongoose.Types.ObjectId('6810c4a680b5a97f62abda34'),
  },
  case_list: {
    entityId: new mongoose.Types.ObjectId('68befd179b60f43d4dfc61cc'),
    dataSourceId: new mongoose.Types.ObjectId('6878fab8a1dfb7e7aabb0f01'),
    caseNumberAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d45'),
    otherReferenceNumberAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d46'),
    titleAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d47'),
    statusAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d48'),
    actionDueAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d49'),
    dueDateAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d50'),
    dateTakenAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d51'),
    remarksAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d52'),
    attorneyAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d53'),
    legalAssistantAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d54'),
    assignedToAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d55'),
    procedureAgentNameAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d56'),
    localAgentNameAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d57'),
    sbuAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d58'),
    buAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d59'),
    blAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d60'),
    countryAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d61'),
    caseTypeAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d62'),
    activeSwitchAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d63'),
    disclosureAttributeId: new mongoose.Types.ObjectId('689ee71b82768ac30a6e4d64'),
  },
  action_due: {
    entityId: new mongoose.Types.ObjectId('68bef9f69b60f43d4dfc5c48'),
    dataSourceId: new mongoose.Types.ObjectId('68befa979b60f43d4dfc5f00'),
    actionDueAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d4d'),
    stdActionsAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d4e'),
    actionCategoryAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d4f'),
    alertRequiredAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d41'),
    reportCriticalEventAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d42'),
    reportPersonalSchedulerAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d43'),
    reportActionsDueAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d44'),
    excludedAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d45'),
  },
  attorney_fo_mapping: {
    entityId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d46'),
    dataSourceId: new mongoose.Types.ObjectId('68beb0ac1ce7c309aa93a6fa'),
    foNameAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d48'),
    attorneyNameAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d49'),
  },
  formality_officers: {
    entityId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d50'),
    dataSourceId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d51'),
    foNameAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d52'),
    foEmailAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d53'),
    escalation1AttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d54'),
    escalation1EmailIDAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d55'),
    escalation2AttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d56'),
    escalation2EmailIDAttributeId: new mongoose.Types.ObjectId('6877d52fdb2c6e01d9a86d57'),
  },
  ip_counsel: {
    entityId: new mongoose.Types.ObjectId('68be8acf71f7e4d13f155137'),
    dataSourceId: new mongoose.Types.ObjectId('68be8c3071f7e4d13f156605'),
    attorneyNameAttributeId: new mongoose.Types.ObjectId('687a29fb7245e607088f6912'),
    emailAttributeId: new mongoose.Types.ObjectId('687a29fb7245e607088f6913'),
  },
};

const customReportMapSabic = {
  monthlyip: {
    reportId: new mongoose.Types.ObjectId('67caadc2598bffd31565e1b0'),
    intermediateReportId: new mongoose.Types.ObjectId('67caadc2598bffd31565e1b1'),
  },
  intermediatemonthlyip: {
    reportId: new mongoose.Types.ObjectId('67caadc2598bffd31565e1b1'),
  },
  supplementalip: {
    reportId: new mongoose.Types.ObjectId('6810cbd11ecbf1ab5b047f1a'),
  },
};

const attributeOptionMapReportivix = {
  sbu: {
    id: new mongoose.Types.ObjectId('679232a1753ceb4945e5b396'),
    attributeName: 'SBU STATIC',
    attributeValue: [
      'Corp T&I',
      'Metals',
      'Agri-Nutrients',
      'Chemicals',
      'Polymers',
      'PetChem -Total',
      'Specialties',
      'Strategy & Transformation',
      'Totals',
    ],
  },
  actionDue: {
    id: new mongoose.Types.ObjectId('68bfe9a29b60f43d4d0ab7d3'),
    attributeName: 'Action Due',
    attributeValue: [],
  },
  stdAction: {
    id: new mongoose.Types.ObjectId('68a7140721450a2ddaeae545'),
    attributeName: 'STD Actions Due',
    attributeValue: [],
  },
  actionCategory: {
    id: new mongoose.Types.ObjectId('68a7140721450a2ddaeae548'),
    attributeName: 'Action Category',
    attributeValue: [],
  },
  attorneyName: {
    id: new mongoose.Types.ObjectId('68a7163221450a2ddaeaec85'),
    attributeName: 'Attorney Name',
    attributeValue: [],
  },
  foName: {
    id: new mongoose.Types.ObjectId('68a7160121450a2ddaeaeb61'),
    attributeName: 'FO Name',
    attributeValue: [],
  },
  procedureAgentName: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f833'),
    attributeName: 'ProcedureAgentName',
    attributeValue: [],
  },
  localAgentName: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f837'),
    attributeName: 'LocalAgentName',
    attributeValue: [],
  },
  notivixSBU: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f83b'),
    attributeName: 'SBU',
    attributeValue: [],
  },
  country: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f83f'),
    attributeName: 'Country',
    attributeValue: [],
  },
};
const attributeOptionMapSabic = {
  sbu: {
    id: new mongoose.Types.ObjectId('679232a1753ceb4945e5b397'),
    attributeName: 'SBU STATIC',
    attributeValue: [
      'Corp T&I',
      'Metals',
      'Agri-Nutrients',
      'Chemicals',
      'Polymers',
      'PetChem -Total',
      'Specialties',
      'Strategy & Transformation',
      'Totals',
    ],
  },
  actionDue: {
    id: new mongoose.Types.ObjectId('68bfe9a29b60f43d4d0ab7e3'),
    attributeName: 'Action Due',
    attributeValue: [],
  },
  stdAction: {
    id: new mongoose.Types.ObjectId('68a7140721450a2ddaeae546'),
    attributeName: 'STD Actions Due',
    attributeValue: [],
  },
  actionCategory: {
    id: new mongoose.Types.ObjectId('68a7140721450a2ddaeae549'),
    attributeName: 'Action Category',
    attributeValue: [],
  },
  attorneyName: {
    id: new mongoose.Types.ObjectId('68a7163221450a2ddaeaec86'),
    attributeName: 'Attorney Name',
    attributeValue: [],
  },
  foName: {
    id: new mongoose.Types.ObjectId('68a7160121450a2ddaeaeb62'),
    attributeName: 'FO Name',
    attributeValue: [],
  },
  procedureAgentName: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f834'),
    attributeName: 'ProcedureAgentName',
    attributeValue: [],
  },
  localAgentName: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f838'),
    attributeName: 'LocalAgentName',
    attributeValue: [],
  },
  notivixSBU: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f83e'),
    attributeName: 'SBU',
    attributeValue: [],
  },
  country: {
    id: new mongoose.Types.ObjectId('68d64e82494cb308cee3f83a'),
    attributeName: 'Country',
    attributeValue: [],
  },
};

const derivedField = {
  inHouseDerivedFieldId: new mongoose.Types.ObjectId('68d646483c915b838889d92c'),
  caseListStatusPendingDerivedFieldId: new mongoose.Types.ObjectId('68d646f33c915b838889d936'),
  reportCategoryDerivedFieldId: new mongoose.Types.ObjectId('68d646ca3c915b838889d930'),
};

export async function seedDatabase() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.info(`MongoDB Connected: ${conn.connection.host}`);
    console.info('\n====> Seeding organizations <====');
    await seedOrganizations([
      {
        _id: payload.reportivixOrganizationId,
        name: 'ReportiVix',
        owner: payload.reportivixSuperAdminUserId,
        code: 'reportivix',
        isMaster: true,
      },
      {
        _id: payload.sabicOrganizationId,
        name: 'SABIC',
        owner: payload.sabicAdminUserId,
        code: 'sabic',
      },
    ]);

    console.info('\n====> Seeding Widget Theme <====');
    await seedWidgetTheme({
      ...payload,
      organizationId: payload.reportivixOrganizationId,
      superAdminUserId: payload.reportivixSuperAdminUserId,
    });

    await seedProducts(payload);

    await seedPermissions([
      {
        name: 'Case List',
        dataSourceId: entityDataSourceMapReportivix.case_list.dataSourceId,
        resourceType: 'Data Source',
        code: 'case_list',
        organizationId: payload.reportivixOrganizationId,
      },
      {
        name: 'Action Due',
        dataSourceId: entityDataSourceMapReportivix.action_due.dataSourceId,
        code: 'action_due',
        organizationId: payload.reportivixOrganizationId,
      },
      {
        name: 'IP Counsel',
        dataSourceId: entityDataSourceMapReportivix.ip_counsel.dataSourceId,
        code: 'ip_counsel',
        organizationId: payload.reportivixOrganizationId,
      },
      {
        name: 'Formality Officers',
        dataSourceId: entityDataSourceMapReportivix.formality_officers.dataSourceId,
        code: 'formality_officers',
        organizationId: payload.reportivixOrganizationId,
      },
      {
        name: 'Case List',
        dataSourceId: entityDataSourceMapSabic.case_list.dataSourceId,
        resourceType: 'Data Source',
        code: 'case_list',
        organizationId: payload.sabicOrganizationId,
      },
      {
        name: 'Action Due',
        dataSourceId: entityDataSourceMapSabic.action_due.dataSourceId,
        code: 'action_due',
        organizationId: payload.sabicOrganizationId,
      },
      {
        name: 'IP Counsel',
        dataSourceId: entityDataSourceMapSabic.ip_counsel.dataSourceId,
        code: 'ip_counsel',
        organizationId: payload.sabicOrganizationId,
      },
      {
        name: 'Formality Officers',
        dataSourceId: entityDataSourceMapSabic.formality_officers.dataSourceId,
        code: 'formality_officers',
        organizationId: payload.sabicOrganizationId,
      },
    ]);

    await createProductSubscription([
      {
        organizationId: payload.reportivixOrganizationId,
        productIds: [payload.reportivixProductId, payload.notivixProductId],
        status: 'active',
        totalLicenses: 10,
        durationInMonths: 12,
      },
      {
        organizationId: payload.sabicOrganizationId,
        productIds: [payload.reportivixProductId, payload.notivixProductId],
        status: 'active',
        totalLicenses: 10,
        durationInMonths: 12,
      },
    ]);

    await seedRolesAndPermissions({ organizationId: [payload.reportivixOrganizationId, payload.sabicOrganizationId] });
    await seedUsers([
      {
        organizationId: payload.reportivixOrganizationId,
        isMaster: true,
        users: [
          {
            email: 'superadmin@reportivix.com',
            password: 'superadmin@1234',
            firstName: 'Super',
            lastName: 'Admin',
            type: 'superadmin',
            customId: payload.reportivixSuperAdminUserId,
          },
          {
            email: 'admin@reportivix.com',
            password: 'admin@1234',
            firstName: 'Admin',
            lastName: 'User',
            type: 'admin',
            customId: payload.reportivixAdminUserId,
          },
          {
            email: 'test@reportivix.com',
            password: 'test@1234',
            firstName: 'Test',
            lastName: 'User',
            type: 'user',
            customId: payload.reportivixTestUserId,
          },
        ],
      },
      {
        organizationId: payload.sabicOrganizationId,
        isMaster: false,
        users: [
          {
            email: 'cs.sabic@innovix-labs.com',
            password: 'Sabic@1234',
            firstName: 'Sabic',
            lastName: 'Admin',
            type: 'admin',
            customId: payload.sabicAdminUserId,
          },
          {
            email: 'mahua.dutta@sabic.com',
            password: 'Sabic@1234',
            firstName: 'Mahua',
            lastName: 'Dutta',
            type: 'admin',
            customId: payload.mahuaAdminUserId,
          },
        ],
      },
    ]);

    await seedAttributeOptions({
      organizationId: payload.reportivixOrganizationId,
      createdBy: payload.reportivixSuperAdminUserId,
      updatedBy: payload.reportivixSuperAdminUserId,
      attributeOptionMap: attributeOptionMapReportivix,
    });

    await seedAttributeOptions({
      organizationId: payload.sabicOrganizationId,
      createdBy: payload.sabicAdminUserId,
      updatedBy: payload.sabicAdminUserId,
      attributeOptionMap: attributeOptionMapSabic,
    });
    console.info('\n====> Seeding Entities Reportivix <====');
    await seedEntities({
      organizationId: payload.reportivixOrganizationId,
      createdBy: payload.reportivixSuperAdminUserId,
      updatedBy: payload.reportivixSuperAdminUserId,
      entityDataSourceMap: entityDataSourceMapReportivix,
      attributeOptionMap: attributeOptionMapReportivix,
    });

    console.info('\n====> Seeding Data source Reportivix <====');
    await seedDataSource({
      organizationId: payload.reportivixOrganizationId,
      createdBy: payload.reportivixSuperAdminUserId,
      updatedBy: payload.reportivixSuperAdminUserId,
      entityDataSourceMap: entityDataSourceMapReportivix,
      derivedFieldMapping: derivedField,
    });

    console.info('\n====> Seeding Custom Report Reportivx<====');
    await seedCustomReports({
      organizationId: payload.reportivixOrganizationId,
      entityDataSourceMap: entityDataSourceMapReportivix,
      customReportMap: customReportMapReportivix,
    });

    console.info('\n====> Seeding Entities Sabic <====');
    await seedEntities({
      organizationId: payload.sabicOrganizationId,
      createdBy: payload.sabicAdminUserId,
      updatedBy: payload.sabicAdminUserId,
      entityDataSourceMap: entityDataSourceMapSabic,
      attributeOptionMap: attributeOptionMapSabic,
    });

    console.info('\n====> Seeding Data source Sabic <====');
    await seedDataSource({
      organizationId: payload.sabicOrganizationId,
      createdBy: payload.sabicAdminUserId,
      updatedBy: payload.sabicAdminUserId,
      entityDataSourceMap: entityDataSourceMapSabic,
      derivedFieldMapping: derivedField,
    });

    await seedDerivedField({
      derivedFieldMapping: derivedField,
      entityMapping: entityDataSourceMapReportivix,
    });
    console.info('\n====> Seeding Custom Report Sabic<====');
    await seedCustomReports({
      organizationId: payload.sabicOrganizationId,
      entityDataSourceMap: entityDataSourceMapSabic,
      customReportMap: customReportMapSabic,
    });

    console.info('\n====> Seeding Dashboard <====');
    await seedDashboard();

    console.info('\n====> Seeding Chart <====');
    await seedChart(payload);

    console.info('\n====> Seeding Operators <====');
    await seedOperators();

    await seedDashboardsForOrganization({
      organizationId: payload.reportivixOrganizationId,
      widgetThemeId: payload.widgetThemeId,
      dashboardName: 'Notivix Dashboard',
      entityDataSourceMap: entityDataSourceMapReportivix,
      widgets: [
        {
          widgetTypeId: payload.verticalBarChartId,
          name: 'Formality Officers',
          dimensions: 'Attorney.AttorneyName.FOName.FOName',
          groupBy: ['ActionDue.ReportCriticalEvent'],
          aggregation: { type: 'Count', attributeName: 'CaseNumber' },
          position: { x: 0, y: 0, index: 0 },
          conditions: [{ field: 'Attorney.AttorneyName.FOName.FOName', operator: 'notblank', value: '' }],
          dataSourceId: entityDataSourceMapReportivix.case_list.dataSourceId,
          entityId: entityDataSourceMapReportivix.case_list.entityId,
          isIncremental: false,
        },
      ],
    });
    await seedDashboardsForOrganization({
      organizationId: payload.sabicOrganizationId,
      widgetThemeId: payload.widgetThemeId,
      dashboardName: 'Notivix Dashboard',
      entityDataSourceMap: entityDataSourceMapSabic,
      widgets: [
        {
          widgetTypeId: payload.verticalBarChartId,
          name: 'Formality Officers',
          dimensions: 'Attorney.AttorneyName.FOName.FOName',
          groupBy: ['ActionDue.ReportCriticalEvent'],
          aggregation: { type: 'Count', attributeName: 'CaseNumber' },
          position: { x: 0, y: 0, index: 0 },
          conditions: [{ field: 'Attorney.AttorneyName.FOName.FOName', operator: 'notblank', value: '' }],
          dataSourceId: entityDataSourceMapSabic.case_list.dataSourceId,
          entityId: entityDataSourceMapSabic.case_list.entityId,
          isIncremental: false,
        },
      ],
    });
    // console.info('\n====> Seeding Dashboard Widget <====');
    // await seedDashboardWidget();

    console.log('\nDatabase seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
