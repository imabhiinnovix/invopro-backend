export function processReportHeaders({
  data,
  headers,
  totalColumnName,
}: {
  data: Record<string, any>[];
  headers: { reportHeader: string; attributeValues: string[] }[];
  isTotal?: boolean;
  totalColumnName?: string;
}) {
  try {
    return data.map((entry) => {
      const processedEntry: Record<string, string | number> = {};
      let total = 0;

      headers.forEach(({ reportHeader, attributeValues }) => {
        let sum = 0;
        let concatenatedString = '';
        let hasValidValue = false;

        attributeValues.forEach((attr) => {
          if (Object.prototype.hasOwnProperty.call(entry, attr)) {
            const value = entry[attr];
            const numValue = Number(value);

            if (!isNaN(numValue)) {
              sum += numValue;
              hasValidValue = true;
            } else if (typeof value === 'string') {
              concatenatedString += concatenatedString ? `, ${value}` : value;
              hasValidValue = true;
            }
          }
        });

        if (concatenatedString) {
          processedEntry[reportHeader] = concatenatedString;
        } else if (hasValidValue) {
          processedEntry[reportHeader] = sum;
          total += sum;
        } else {
          processedEntry[reportHeader] = '';
        }
      });

      if (totalColumnName && totalColumnName.length > 0) {
        processedEntry[totalColumnName] = total;
      }
      return processedEntry;
    });
  } catch (e) {
    console.log('Error in processReportHeaders.', e);
    throw e;
  }
}

export function transformMonthlyIpData({
  currentYear,
  isReverseMapping,
}: {
  currentYear: number;
  isReverseMapping?: boolean;
}) {
  const mapping = {
    SBU: 'SBU',
    'First Filings': 'First Filings',
    'Current Year New Apps Filed': `${currentYear} New Apps Filed`,
    'Percentage of Current Year Invention Disclosures converted to Filings': `% of ${currentYear} Invention Disclosures converted to Filings`,
    'Current Year New Apps Estimate': `${currentYear} New Apps Estimate`,
    'Previous Year New Apps Filed': `${currentYear - 1} New Apps filed`,
    'Two Years Ago New Apps Filed': `${currentYear - 2} New Apps filed`,
    'Three Years Ago New Apps Filed': `${currentYear - 3} New Apps filed`,
    'Four Years Ago New Apps Filed': `${currentYear - 4} New Apps filed`,
    Disclosures: 'Disclosures',
    'Apps Being Drafted': `Apps Being Drafted`,
    'Current Year Projects Opened': `Projects Opened in ${currentYear}`,
    'Previous Year Projects Opened': `Projects Opened in ${currentYear - 1}`,
    'Two Years Ago Projects Opened': `Projects Opened in ${currentYear - 2}`,
    'Three Years Ago Projects Opened': `Projects Opened in ${currentYear - 3}`,
    'Four Years Ago Projects Opened': `Projects Opened in ${currentYear - 4}`,
    'Total Active Projects': `Total Active Projects`,
    'Current Year Issued': `${currentYear} Issued`,
    'Current Year US Issued': `${currentYear} US Issued`,
    'Current Year Intl Issued': `${currentYear} Intl Issued`,
    'Pending Applications': 'Pending Applications',
    'Total US Apps pending': `Total US Apps pending`,
    'Total EP Apps pending': `Total EP Apps pending`,
    'Total CN Apps pending': `Total CN Apps pending`,
    'Other Country Apps pending': `Other Country Apps pending`,
    'Total Apps pending': `Total Apps pending`,
    'Issued Patents': 'Issued Patents',
    'Total US Issued': `Total US Issued`,
    'Total EP Issued': `Total EP Issued`,
    'Total CN Issued': `Total CN Issued`,
    'Other Country Issued': `Other Country Issued`,
    'Total Issued': `Total Issued`,
    'Total Portfolio (Apps Pending Plus Issued)': `Total Portfolio: Apps Pending+ Issued`,
    'Percentage of Total Portfolio': `% of Total Portfolio`,
    'Current Year Renewals Due': `${currentYear} Renewals Due`,
    'Total No of Current Year Reductions (Including reductions during prosecution)': `Total No. of ${currentYear}** Reductions (Including reductions during prosecution)`,
    'Current Year Annuity Savings from Current Year reductions': `${currentYear} Annuity Savings from ${currentYear} reductions`,
    'Next Year Annuity Savings from Current Year reductions': `${currentYear + 1} Annuity Savings from ${currentYear} reductions`,
    'Current Year-Next Year Annuity Savings from Current reductions': `${currentYear}-${currentYear + 1} Annuity Savings from ${currentYear} reductions`,
    'Number of Prosecution reductions in Current Year': `No. of Prosecution reductions in ${currentYear}`,
    'Prosecution cost Savings': 'Prosecution cost Savings',
    'Total Cost Savings (Current Year-Next Year) Annuity Savings Plus Prosecution savings from Current reductions': `Total Cost Savings: (${currentYear}-${currentYear + 1}) Annuity Savings + Prosecution savings from ${currentYear} reductions`,
  };
  if (isReverseMapping) {
    const reverseMapping = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value, key]));
    return reverseMapping;
  }
  return mapping;
}
