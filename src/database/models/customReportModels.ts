import createDefaultDataSourceVersionModel from './defaultDataSourceVersionModel';

export type CustomReportModelAccessReturnType = {
  DataSourceVersionValuePortfolio: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueDisclosure: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueAnnuities: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueCtclinsabs: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueSabicips: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueSabicContracts: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueShppContracts: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueKsaContracts: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueAttorneyMapping: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueAgreementTypemapping: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueIpAnalystDashboard: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueStaticNewFilings: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueStaticEstimates: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueStaticProjectOpened: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueShppAccolade: ReturnType<typeof createDefaultDataSourceVersionModel>;
  DataSourceVersionValueSabicAccolade: ReturnType<typeof createDefaultDataSourceVersionModel>;
};

export async function CustomReportModelAccess({ orgCode }: { orgCode: string }) {
  const DataSourceVersionValuePortfolio = createDefaultDataSourceVersionModel(`data_${orgCode}_portfolios`);
  const DataSourceVersionValueDisclosure = createDefaultDataSourceVersionModel(`data_${orgCode}_disclosures`);
  const DataSourceVersionValueAnnuities = createDefaultDataSourceVersionModel(`data_${orgCode}_annuities`);
  const DataSourceVersionValueCtclinsabs = createDefaultDataSourceVersionModel(`data_${orgCode}_ctclinsabs`);
  const DataSourceVersionValueSabicips = createDefaultDataSourceVersionModel(`data_${orgCode}_sabicips`);

  const DataSourceVersionValueSabicContracts = createDefaultDataSourceVersionModel(`data_${orgCode}_sabiccontracts`);
  const DataSourceVersionValueShppContracts = createDefaultDataSourceVersionModel(`data_${orgCode}_shppcontracts`);
  const DataSourceVersionValueKsaContracts = createDefaultDataSourceVersionModel(`data_${orgCode}_ksacontracts`);
  const DataSourceVersionValueAttorneyMapping = createDefaultDataSourceVersionModel(`data_${orgCode}_attorneymapping`);
  const DataSourceVersionValueAgreementTypemapping = createDefaultDataSourceVersionModel(
    `data_${orgCode}_agreementtypemapping`
  );
  const DataSourceVersionValueIpAnalystDashboard = createDefaultDataSourceVersionModel(
    `data_${orgCode}_ipanalystdashboard`
  );

  const DataSourceVersionValueStaticNewFilings = createDefaultDataSourceVersionModel(`data_${orgCode}_newfilings`);
  const DataSourceVersionValueStaticEstimates = createDefaultDataSourceVersionModel(`data_${orgCode}_estimates`);
  const DataSourceVersionValueStaticProjectOpened = createDefaultDataSourceVersionModel(
    `data_${orgCode}_projectsopened`
  );

  const DataSourceVersionValueShppAccolade = createDefaultDataSourceVersionModel(`data_${orgCode}_shppaccolade`);

  const DataSourceVersionValueSabicAccolade = createDefaultDataSourceVersionModel(`data_${orgCode}_sabicaccolade`);
  return {
    DataSourceVersionValuePortfolio,
    DataSourceVersionValueDisclosure,
    DataSourceVersionValueAnnuities,
    DataSourceVersionValueCtclinsabs,
    DataSourceVersionValueSabicips,
    DataSourceVersionValueSabicContracts,
    DataSourceVersionValueShppContracts,
    DataSourceVersionValueKsaContracts,
    DataSourceVersionValueAttorneyMapping,
    DataSourceVersionValueAgreementTypemapping,
    DataSourceVersionValueIpAnalystDashboard,
    DataSourceVersionValueStaticNewFilings,
    DataSourceVersionValueStaticEstimates,
    DataSourceVersionValueStaticProjectOpened,
    DataSourceVersionValueShppAccolade,
    DataSourceVersionValueSabicAccolade,
  };
}
