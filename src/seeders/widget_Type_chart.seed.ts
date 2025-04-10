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

  // Check if the Area chart already exists
  const existingAreaChart = await WidgetType.findById(payload.areaChartId);

  if (!existingAreaChart) {
    const areaChart = new WidgetType({
      _id: payload.areaChartId,
      name: 'area',
      description: 'test area description',
      chartType: 'area',
      code: 'area-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await areaChart.save();
    console.info('Area chart created successfully.');
  }

  // Check if the Number chart already exists
  const existingNumberChart = await WidgetType.findById(payload.numberChartId);

  if (!existingNumberChart) {
    const numberChart = new WidgetType({
      _id: payload.numberChartId,
      name: 'number',
      description: 'test number description',
      chartType: 'number',
      code: 'number-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await numberChart.save();
    console.info('Number chart created successfully.');
  }

  // Check if the Horizontal Bar Chart already exists
  const existingHorizontalBarChart = await WidgetType.findById(payload.horizontalBarChartId);

  if (!existingHorizontalBarChart) {
    const horizontalBarChart = new WidgetType({
      _id: payload.horizontalBarChartId,
      name: 'horizontalBar',
      description: 'test horizontal bar description',
      chartType: 'horizontalBar',
      code: 'horizontalBar-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await horizontalBarChart.save();
    console.info('Horizontal Bar chart created successfully.');
  }

  // Check if the Vertical Bar Chart already exists
  const existingVerticalBarChart = await WidgetType.findById(payload.verticalBarChartId);

  if (!existingVerticalBarChart) {
    const verticalBarChart = new WidgetType({
      _id: payload.verticalBarChartId,
      name: 'verticalBar',
      description: 'test vertical bar description',
      chartType: 'verticalBar',
      code: 'verticalBar-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await verticalBarChart.save();
    console.info('Vertical Bar chart created successfully.');
  }

  // Check if the Stacked Bar Chart already exists
  const existingStackedBarChart = await WidgetType.findById(payload.stackedBarChartId);

  if (!existingStackedBarChart) {
    const stackedBarChart = new WidgetType({
      _id: payload.stackedBarChartId,
      name: 'stackedBar',
      description: 'test stacked bar description',
      chartType: 'stackedBar',
      code: 'stackedBar-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await stackedBarChart.save();
    console.info('Stacked Bar chart created successfully.');
  }

  // Check if the Bubble Chart already exists
  const existingBubbleChart = await WidgetType.findById(payload.bubbleChartId);

  if (!existingBubbleChart) {
    const bubbleChart = new WidgetType({
      _id: payload.bubbleChartId,
      name: 'bubble',
      description: 'test bubble description',
      chartType: 'bubble',
      code: 'bubble-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await bubbleChart.save();
    console.info('Bubble chart created successfully.');
  }

  // Check if the Doughnut Chart already exists
  const existingDoughnutChart = await WidgetType.findById(payload.doughnutChartId);

  if (!existingDoughnutChart) {
    const doughnutChart = new WidgetType({
      _id: payload.doughnutChartId,
      name: 'doughnut',
      description: 'test doughnut description',
      chartType: 'doughnut',
      code: 'doughnut-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await doughnutChart.save();
    console.info('Doughnut chart created successfully.');
  }

  // Check if the Multi Series Bar Chart already exists
  const existingMultiSeriesBarChart = await WidgetType.findById(payload.multiSeriesBarChartId);

  if (!existingMultiSeriesBarChart) {
    const multiSeriesBarChart = new WidgetType({
      _id: payload.multiSeriesBarChartId,
      name: 'multiSeriesBar',
      description: 'test multi series bar description',
      chartType: 'multiSeriesBar',
      code: 'multiSeriesBar-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await multiSeriesBarChart.save();
    console.info('Multi Series Bar chart created successfully.');
  }

  // Check if the Polar Area Chart already exists
  const existingPolarAreaChart = await WidgetType.findById(payload.polarAreaChartId);

  if (!existingPolarAreaChart) {
    const polarAreaChart = new WidgetType({
      _id: payload.polarAreaChartId,
      name: 'polarArea',
      description: 'test polar area description',
      chartType: 'polarArea',
      code: 'polarArea-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await polarAreaChart.save();
    console.info('Polar Area chart created successfully.');
  }

  // Check if the Radar Chart already exists
  const existingRadarChart = await WidgetType.findById(payload.radarChartId);

  if (!existingRadarChart) {
    const radarChart = new WidgetType({
      _id: payload.radarChartId,
      name: 'radar',
      description: 'test radar description',
      chartType: 'radar',
      code: 'radar-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await radarChart.save();
    console.info('Radar chart created successfully.');
  }

  // Check if the Scatter Chart already exists
  const existingScatterChart = await WidgetType.findById(payload.scatterChartId);

  if (!existingScatterChart) {
    const scatterChart = new WidgetType({
      _id: payload.scatterChartId,
      name: 'scatter',
      description: 'test scatter description',
      chartType: 'scatter',
      code: 'scatter-1',
      isActive: true,
      createdAt: new Date('2024-08-07'),
      updatedAt: new Date('2024-08-07'),
    });

    await scatterChart.save();
    console.info('Scatter chart created successfully.');
  }
}
