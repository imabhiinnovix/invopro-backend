export function processReportHeaders({
  data,
  headers,
}: {
  data: Record<string, any>[];
  headers: { reportHeader: string; attributeValues: string[] }[];
}) {
  try {
    return data.map((entry) => {
      const processedEntry: Record<string, string | number> = {};

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
        } else {
          processedEntry[reportHeader] = '';
        }
      });

      return processedEntry;
    });
  } catch (e) {
    console.log('Error in processReportHeaders.', e);
    throw e;
  }
}
