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
