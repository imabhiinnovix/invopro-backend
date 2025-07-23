/* eslint-disable @typescript-eslint/no-explicit-any */
import WidgetType from '../database/models/common/widgetType';

export async function seedChart(payload) {
  const fieldConfig = {
    line: [
      {
        fieldName: 'dimensions',
        display: true,
        required: true,
        multiple: true,
        label: 'Dimensions',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'groupBy',
        display: true,
        required: true,
        multiple: true,
        label: 'Group By',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'size',
        display: false,
        required: false,
        multiple: false,
        label: 'Size',
        type: 'select' as const,
      },
      {
        fieldName: 'aggregation',
        display: true,
        required: true,
        multiple: false,
        label: 'Aggregation',
        type: 'select' as const,
      },
      {
        fieldName: 'conditions',
        display: true,
        required: false,
        multiple: true,
        label: 'Conditions',
        type: 'multiselect' as const,
      },
    ],
    pie: [
      {
        fieldName: 'dimensions',
        display: true,
        required: true,
        multiple: true,
        label: 'Dimensions',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'groupBy',
        display: false,
        required: false,
        multiple: false,
        label: 'Group By',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'size',
        display: false,
        required: false,
        multiple: false,
        label: 'Size',
        type: 'select' as const,
      },
      {
        fieldName: 'aggregation',
        display: true,
        required: true,
        multiple: false,
        label: 'Aggregation',
        type: 'select' as const,
      },
      {
        fieldName: 'conditions',
        display: true,
        required: false,
        multiple: true,
        label: 'Conditions',
        type: 'multiselect' as const,
      },
    ],
    bubble: [
      {
        fieldName: 'dimensions',
        display: true,
        required: true,
        multiple: true,
        label: 'Dimensions',
        type: 'multiselect',
      },
      {
        fieldName: 'groupBy',
        display: true,
        required: true,
        multiple: true,
        label: 'Group By',
        type: 'multiselect',
      },
      {
        fieldName: 'size',
        display: true,
        required: false,
        multiple: true,
        label: 'Size',
        type: 'select',
      },
      {
        fieldName: 'aggregation',
        display: true,
        required: true,
        multiple: false,
        label: 'Aggregation',
        type: 'select',
      },
      {
        fieldName: 'conditions',
        display: true,
        required: false,
        multiple: true,
        label: 'Conditions',
        type: 'multiselect',
      },
    ],
    number: [
      {
        fieldName: 'dimensions',
        display: false,
        required: false,
        multiple: false,
        label: 'Dimensions',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'groupBy',
        display: false,
        required: false,
        multiple: false,
        label: 'Group By',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'size',
        display: false,
        required: false,
        multiple: false,
        label: 'Size',
        type: 'select' as const,
      },
      {
        fieldName: 'aggregation',
        display: true,
        required: true,
        multiple: false,
        label: 'Aggregation',
        type: 'select' as const,
      },
      {
        fieldName: 'conditions',
        display: true,
        required: false,
        multiple: true,
        label: 'Conditions',
        type: 'multiselect' as const,
      },
    ],
    tabular: [
      {
        fieldName: 'dimensions',
        display: true,
        required: true,
        multiple: true,
        label: 'Dimensions',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'groupBy',
        display: true,
        required: true,
        multiple: true,
        label: 'Group By',
        type: 'multiselect' as const,
      },
      {
        fieldName: 'size',
        display: false,
        required: false,
        multiple: false,
        label: 'Size',
        type: 'select' as const,
      },
      {
        fieldName: 'aggregation',
        display: true,
        required: true,
        multiple: false,
        label: 'Aggregation',
        type: 'select' as const,
      },
      {
        fieldName: 'conditions',
        display: true,
        required: false,
        multiple: true,
        label: 'Conditions',
        type: 'multiselect' as const,
      },
    ],
  };

  const chartData = [
    {
      id: payload.pieChartId,
      name: 'Pie',
      description: 'test pie description',
      chartType: 'pie',
      code: 'pie-1',
      fieldConfig: fieldConfig.pie,
    },
    {
      id: payload.lineChartId,
      name: 'Line',
      description: 'test line description',
      chartType: 'line',
      code: 'line-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.areaChartId,
      name: 'Area',
      description: 'test area description',
      chartType: 'area',
      code: 'area-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.numberChartId,
      name: 'Number',
      description: 'test number description',
      chartType: 'number',
      code: 'number-1',
      fieldConfig: fieldConfig.number,
    },
    {
      id: payload.horizontalBarChartId,
      name: 'Horizontal Bar',
      description: 'test horizontal bar description',
      chartType: 'horizontalBar',
      code: 'horizontalBar-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.verticalBarChartId,
      name: 'Vertical Bar',
      description: 'test vertical bar description',
      chartType: 'verticalBar',
      code: 'verticalBar-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.stackedBarChartId,
      name: 'Stacked Bar',
      description: 'test stacked bar description',
      chartType: 'stackedBar',
      code: 'stackedBar-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.bubbleChartId,
      name: 'Bubble',
      description: 'test bubble description',
      chartType: 'bubble',
      code: 'bubble-1',
      fieldConfig: fieldConfig.bubble,
    },
    {
      id: payload.doughnutChartId,
      name: 'Doughnut',
      description: 'test doughnut description',
      chartType: 'doughnut',
      code: 'doughnut-1',
      fieldConfig: fieldConfig.pie,
    },
    {
      id: payload.multiSeriesPieChartId,
      name: 'Multi Series Pie',
      description: 'test multi series pie description',
      chartType: 'multiSeriesPie',
      code: 'multiSeriesPie-1',
      fieldConfig: fieldConfig.pie,
    },
    {
      id: payload.polarAreaChartId,
      name: 'Polar Area',
      description: 'test polar area description',
      chartType: 'polarArea',
      code: 'polarArea-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.radarChartId,
      name: 'Radar',
      description: 'test radar description',
      chartType: 'radar',
      code: 'radar-1',
      fieldConfig: fieldConfig.line,
    },
    {
      id: payload.scatterChartId,
      name: 'Scatter',
      description: 'test scatter description',
      chartType: 'scatter',
      code: 'scatter-1',
      fieldConfig: fieldConfig.bubble,
    },
    {
      id: payload.tabularChartId,
      name: 'Tabular',
      description: 'test tabular description',
      chartType: 'tabular',
      code: 'tabular-1',
      fieldConfig: fieldConfig.tabular,
    },
  ];

  for (const chart of chartData) {
    const existingChart: any = await WidgetType.findById(chart.id);

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
        fieldConfig: chart.fieldConfig,
      });

      await newChart.save();
      console.info(`${chart.name.charAt(0).toUpperCase() + chart.name.slice(1)} chart created successfully.`);
    } else {
      // Update the name to capitalize the first letter
      const updatedName = existingChart.name.charAt(0).toUpperCase() + existingChart.name.slice(1);
      if (existingChart.name !== updatedName) {
        existingChart.name = updatedName;
      }
      existingChart.description = chart.description;
      existingChart.chartType = chart.chartType;
      existingChart.code = chart.code;
      existingChart.fieldConfig = chart.fieldConfig;

      await existingChart.save();
      console.info(`${updatedName} chart updated successfully.`);
    }
  }
}
