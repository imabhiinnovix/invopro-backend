import WidgetType from '../database/models/widgetType';

export async function seedChart(payload) {
  const chartData = [
    { id: payload.pieChartId, name: 'Pie', description: 'test pie description', chartType: 'pie', code: 'pie-1' },
    { id: payload.lineChartId, name: 'Line', description: 'test line description', chartType: 'line', code: 'line-1' },
    { id: payload.areaChartId, name: 'Area', description: 'test area description', chartType: 'area', code: 'area-1' },
    {
      id: payload.numberChartId,
      name: 'Number',
      description: 'test number description',
      chartType: 'number',
      code: 'number-1',
    },
    {
      id: payload.horizontalBarChartId,
      name: 'Horizontal Bar',
      description: 'test horizontal bar description',
      chartType: 'horizontalBar',
      code: 'horizontalBar-1',
    },
    {
      id: payload.verticalBarChartId,
      name: 'Vertical Bar',
      description: 'test vertical bar description',
      chartType: 'verticalBar',
      code: 'verticalBar-1',
    },
    {
      id: payload.stackedBarChartId,
      name: 'Stacked Bar',
      description: 'test stacked bar description',
      chartType: 'stackedBar',
      code: 'stackedBar-1',
    },
    {
      id: payload.bubbleChartId,
      name: 'Bubble',
      description: 'test bubble description',
      chartType: 'bubble',
      code: 'bubble-1',
    },
    {
      id: payload.doughnutChartId,
      name: 'Doughnut',
      description: 'test doughnut description',
      chartType: 'doughnut',
      code: 'doughnut-1',
    },
    {
      id: payload.multiSeriesBarChartId,
      name: 'Multi Series Pie',
      description: 'test multi series bar description',
      chartType: 'multiSeriesBar',
      code: 'multiSeriesBar-1',
    },
    {
      id: payload.polarAreaChartId,
      name: 'Polar Area',
      description: 'test polar area description',
      chartType: 'polarArea',
      code: 'polarArea-1',
    },
    {
      id: payload.radarChartId,
      name: 'Radar',
      description: 'test radar description',
      chartType: 'radar',
      code: 'radar-1',
    },
    {
      id: payload.scatterChartId,
      name: 'Scatter',
      description: 'test scatter description',
      chartType: 'scatter',
      code: 'scatter-1',
    },
  ];

  for (const chart of chartData) {
    const existingChart = await WidgetType.findById(chart.id);

    if (!existingChart) {
      const newChart = new WidgetType({
        _id: chart.id,
        name: chart.name,
        description: chart.description,
        chartType: chart.chartType,
        code: chart.code,
        isActive: true,
        createdAt: new Date('2024-08-07'),
        updatedAt: new Date('2024-08-07'),
      });

      await newChart.save();
      console.info(`${chart.name.charAt(0).toUpperCase() + chart.name.slice(1)} chart created successfully.`);
    } else {
      // Update the name to capitalize the first letter
      const updatedName = existingChart.name.charAt(0).toUpperCase() + existingChart.name.slice(1);

      if (existingChart.name !== updatedName) {
        existingChart.name = updatedName;
        await existingChart.save();
        console.info(`${updatedName} chart updated successfully.`);
      }
    }
  }
}
