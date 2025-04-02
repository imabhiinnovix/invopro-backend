import WidgetType from '../database/models/widgetType';

export async function seedChart(payload) {
  // Check if the Pie Chart already exists
  const existingPieChart = await WidgetType.findById(payload.pieChartId);

  if (!existingPieChart) {
    const pieChart = new WidgetType({
      _id: payload.pieChartId,
      name: 'pie',
      description: 'test pie description',
      chartType: 'pie',
      code: 'pie-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await pieChart.save();
    console.info('Pie chart created successfully.');
  }

  // Check if the Line chart already exists
  const existingLineChart = await WidgetType.findById(payload.lineChartId);

  if (!existingLineChart) {
    const lineChart = new WidgetType({
      _id: payload.lineChartId,
      name: 'line',
      description: 'test line description',
      chartType: 'line',
      code: 'line-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await lineChart.save();
    console.info('Line chart created successfully.');
  }
}
