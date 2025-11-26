import mongoose from 'mongoose';
import config from '../config';
import { seedCustomReports } from './customReport.seed';
import { seedDataSource } from './dataSource.seed';
import { seedOrgDataSource } from './orgDataSource.seed';

const payload = {
organizationId: new mongoose.Types.ObjectId('6925c6d40de6231d930e148b'),
adminId: new mongoose.Types.ObjectId('6925c7100de6231d930e17e7')
};
const customReportMap = {
  monthlyip: {
    reportId: new mongoose.Types.ObjectId('67c6b1170188607541659765'),
    intermediateReportId: new mongoose.Types.ObjectId('683588c4d8459308307d9840'),
  },
  intermediatemonthlyip: {
    reportId: new mongoose.Types.ObjectId('683588c4d8459308307d9840'),
  },
  supplementalip: {
    reportId: new mongoose.Types.ObjectId('67c7fa3874d10de5c51ae651'),
  },
};

const entityDataSourceMap = {
disclosure: {
entityId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d6f'),
dataSourceId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d85'),
},
portfolio: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3dc6'),
},
sabicip: {
entityId: new mongoose.Types.ObjectId('6926f9d60de6231d934a5416'),
dataSourceId: new mongoose.Types.ObjectId('6926f9d60de6231d934a543b'),
},
ctclinsab: {
entityId: new mongoose.Types.ObjectId('69270afe0de6231d934aaead'),
dataSourceId: new mongoose.Types.ObjectId('69270afe0de6231d934aaedc'),
},
annuities: {
entityId: new mongoose.Types.ObjectId('6926ffb20de6231d934a7578'),
dataSourceId: new mongoose.Types.ObjectId('6926ffb20de6231d934a7588'),
},
sabiccontracts: {
entityId: new mongoose.Types.ObjectId('6926fe790de6231d934a6be7'),
dataSourceId: new mongoose.Types.ObjectId('6926fe790de6231d934a6c05'),
},
shppcontracts: {
entityId: new mongoose.Types.ObjectId('6926fd480de6231d934a5e69'),
dataSourceId: new mongoose.Types.ObjectId('6926fd480de6231d934a5e87'),
},
ksacontracts: {
entityId: new mongoose.Types.ObjectId('6926f75c0de6231d934a4b4f'),
dataSourceId: new mongoose.Types.ObjectId('6926f75c0de6231d934a4b68'),
},
attorneymapping: {
entityId: new mongoose.Types.ObjectId('6926fae00de6231d934a5a9d'),
dataSourceId: new mongoose.Types.ObjectId('6926fae00de6231d934a5aa5'),
},
agreementtypemapping: {
entityId: new mongoose.Types.ObjectId('6926fb290de6231d934a5adb'),
dataSourceId: new mongoose.Types.ObjectId('6926fb290de6231d934a5ae2'),
},
ipanalystdashboard: {
entityId: new mongoose.Types.ObjectId('692707750de6231d934a98c6'),
dataSourceId: new mongoose.Types.ObjectId('692707750de6231d934a98e9'),
},
shppaccolade: {
entityId: new mongoose.Types.ObjectId('692703fd0de6231d934a8a41'),
dataSourceId: new mongoose.Types.ObjectId('692703fd0de6231d934a8a65'),
},
sabicaccolade: {
entityId: new mongoose.Types.ObjectId('6927044f0de6231d934a8a90'),
dataSourceId: new mongoose.Types.ObjectId('6927044f0de6231d934a8ab4'),
},
newfilings: {
entityId: new mongoose.Types.ObjectId('692705fb0de6231d934a8f8c'),
dataSourceId: new mongoose.Types.ObjectId('692705fb0de6231d934a8f93'),
},
estimates: {
entityId: new mongoose.Types.ObjectId('692705ab0de6231d934a8f04'),
dataSourceId: new mongoose.Types.ObjectId('692705ab0de6231d934a8f0b'),
},
projectsopened: {
entityId: new mongoose.Types.ObjectId('692703140de6231d934a874b'),
dataSourceId: new mongoose.Types.ObjectId('692703140de6231d934a8752'),
},
monthlyipglobal: {
entityId: new mongoose.Types.ObjectId('692705150de6231d934a8d70'),
dataSourceId: new mongoose.Types.ObjectId('692705150de6231d934a8d9a'),
},
monthlyipstc: {
entityId: new mongoose.Types.ObjectId('692702620de6231d934a839c'),
dataSourceId: new mongoose.Types.ObjectId('692702620de6231d934a83a5'),
},
monthlyipstcsbu: {
entityId: new mongoose.Types.ObjectId('692701680de6231d934a7c67'),
dataSourceId: new mongoose.Types.ObjectId('692701680de6231d934a7c70'),
},
supplementalipagreementsfinalagreementtype: {
entityId: new mongoose.Types.ObjectId('692700ee0de6231d934a7a65'),
dataSourceId: new mongoose.Types.ObjectId('692700ee0de6231d934a7a71'),
},
supplementalipagreementsothers: {
entityId: new mongoose.Types.ObjectId('6926ed800de6231d934a1564'),
dataSourceId: new mongoose.Types.ObjectId('6926ed800de6231d934a1570'),
},
supplementalipbangaloreipgroupcurrentstatus: {
entityId: new mongoose.Types.ObjectId('6926ec860de6231d934a1510'),
dataSourceId: new mongoose.Types.ObjectId('6926ec860de6231d934a1517'),
},
supplementalipbangaloreipgroupsbu: {
entityId: new mongoose.Types.ObjectId('6926e9e40de6231d934a14bd'),
dataSourceId: new mongoose.Types.ObjectId('6926e9e40de6231d934a14c4'),
},
supplementalipbangaloreipgroupworkscope: {
entityId: new mongoose.Types.ObjectId('6926e90c0de6231d934a146b'),
dataSourceId: new mongoose.Types.ObjectId('6926e90c0de6231d934a1472'),
},
supplementalipbangaloreipgroupworkproduct: {
entityId: new mongoose.Types.ObjectId('6926e8740de6231d934a1417'),
dataSourceId: new mongoose.Types.ObjectId('6926e8740de6231d934a141e'),
},
supplementalipaccolademappingsheet: {
entityId: new mongoose.Types.ObjectId('6926e7240de6231d934a13b6'),
dataSourceId: new mongoose.Types.ObjectId('6926e7240de6231d934a13d8'),
},
supplementalippatentvaluecoverageactive: {
entityId: new mongoose.Types.ObjectId('6926e2880de6231d934a124c'),
dataSourceId: new mongoose.Types.ObjectId('6926e2880de6231d934a125b'),
},
patentvaluecoveragenew: {
entityId: new mongoose.Types.ObjectId('6926d3b60de6231d934a1117'),
dataSourceId: new mongoose.Types.ObjectId('6926d3b60de6231d934a1121'),
},
supplementalipstrategicreportingclass: {
entityId: new mongoose.Types.ObjectId('6926cf8e0de6231d9349facd'),
dataSourceId: new mongoose.Types.ObjectId('6926cf8e0de6231d9349fad7'),
},
supplementalipnewcoverage: {
entityId: new mongoose.Types.ObjectId('6926ceeb0de6231d9349fa35'),
dataSourceId: new mongoose.Types.ObjectId('6926ceeb0de6231d9349fa41'),
},
intermediatemonthlyipcurrentyearnewappfiled: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('683575dcfd604f890f267886'),
},
pctcyinvdisclosurescnvtfilingd: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('683e6eae336975e9f711c99a'),
},
pctcyinvdisclosurescnvtfilingi: {
entityId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d6f'),
dataSourceId: new mongoose.Types.ObjectId('683e6ec3336975e9f711ec65'),
},
pctcyinvdisclosurescnvtfilingt: {
entityId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d6f'),
dataSourceId: new mongoose.Types.ObjectId('683e6ed7336975e9f711ef78'),
},
intermediatemonthlyipappsbeingdrafted: {
entityId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d6f'),
dataSourceId: new mongoose.Types.ObjectId('683eb1a86deb472141801c42'),
},
monthlyip_projects_opened_cy: {
entityId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d6f'),
dataSourceId: new mongoose.Types.ObjectId('6840fd3e0ef4e301481fb93d'),
},
monthlyip_total_active_projects: {
entityId: new mongoose.Types.ObjectId('6926f2310de6231d934a2d6f'),
dataSourceId: new mongoose.Types.ObjectId('6840fdf20ef4e301481fb886'),
},
monthlyip_cy_us_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('68410d0dc1ac3b9dc1257644'),
},
monthlyip_cy_intl_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('68410d44c1ac3b9dc1259911'),
},
total_us_apps_pending: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841330e971865be20078866'),
},
total_ep_apps_pending: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('68413345971865be2007885c'),
},
total_cn_apps_pending: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841337e971865be200776fd'),
},
other_country_apps_pending: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('684133ac971865be20076532'),
},
total_apps_pending: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('684133e5971865be2007887a'),
},
total_us_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841aa0324ef304e9b6b876e'),
},
total_ep_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841aa4424ef304e9b6b6a3c'),
},
total_cn_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841aa8224ef304e9b6b7ac2'),
},
other_country_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841aac924ef304e9b6b28dd'),
},
total_issued: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841ab7224ef304e9b6b2876'),
},
cy_renewals_due: {
entityId: new mongoose.Types.ObjectId('6926cddb0de6231d9349f952'),
dataSourceId: new mongoose.Types.ObjectId('6926cddb0de6231d9349f9a9'),
},
annuity_drop: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841d6f1c12805aa88cd6875'),
},
priority_drop: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841d72ac12805aa88cd6651'),
},
pct_drop: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841d756c12805aa88cd6743'),
},
prosecution_drop: {
entityId: new mongoose.Types.ObjectId('6926f51a0de6231d934a3d9c'),
dataSourceId: new mongoose.Types.ObjectId('6841d780c12805aa88cd665f'),
},
cy_annuity_savings: {
entityId: new mongoose.Types.ObjectId('6926c4ff0de6231d9349f46e'),
dataSourceId: new mongoose.Types.ObjectId('6926c4ff0de6231d9349f49d'),
},
ny_annuity_savings: {
entityId: new mongoose.Types.ObjectId('6926c4ff0de6231d9349f46e'),
dataSourceId: new mongoose.Types.ObjectId('6841e2e3b47f76d5abdd886a'),
},
prosecution_savings: {
entityId: new mongoose.Types.ObjectId('6926c0830de6231d9349f221'),
dataSourceId: new mongoose.Types.ObjectId('6926c0830de6231d9349f24b'),
},
annuities_outstanding: {
entityId: new mongoose.Types.ObjectId('6926ffb20de6231d934a7578'),
dataSourceId: new mongoose.Types.ObjectId('6846791aa0e6c029f6d0754e'),
},
}
export async function seedDatabase() {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI!);
    console.info(`MongoDB Connected: ${conn.connection.host}`);

     console.info('\n====> Seeding Data source Reportivix <====');
    await seedOrgDataSource({
      organizationId: payload.organizationId,
      createdBy: payload.adminId,
      updatedBy: payload.adminId,
      entityDataSourceMap: entityDataSourceMap,
      derivedFieldMapping: {},
    });


    console.info('\n====> Seeding organizations <====');
    await seedCustomReports({
      organizationId: payload.organizationId,
      entityDataSourceMap: entityDataSourceMap,
      customReportMap: customReportMap,
    });

    } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();