/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import WidgetTheme from '../database/models/common/widgetTheme';

export async function seedWidgetTheme(payload) {
  try {
    console.info('\n====> Widget Theme <====');

    const existingWidgetTheme = await WidgetTheme.findById(payload.widgetThemeId);

    if (!existingWidgetTheme) {
      const widgetTheme = new WidgetTheme({
        _id: payload.widgetThemeId,
        createdBy: payload.superAdminUserId,
        organizationId: payload.organizationId,
        name: 'Theme 1',
        title: {
          display: true,
          color: '#2c3e50',
          font: {
            size: 18,
            family: 'Arial',
            weight: 'bold',
          },
          align: 'center',
          position: 'top',
        },
        subtitle: {
          display: true,
          color: '#7f8c8d',
          font: {
            size: 14,
            family: 'Arial',
          },
          align: 'center',
          position: 'top',
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#34495e',
            font: {
              size: 12,
              family: 'Arial',
            },
            usePointStyle: true,
            padding: 20,
            boxWidth: 15,
            boxHeight: 15,
          },
          maxHeight: 100,
        },
        tooltip: {
          display: true,
          backgroundColor: '#2c3e50',
          titleColor: '#ecf0f1',
          borderColor: '#95a5a6',
          borderWidth: 2,
          padding: 10,
          usePointStyle: true,
          displayColors: true,
        },
        scales: {
          y: {
            display: true,
            beginAtZero: true,
            title: {
              display: true,
              color: '#2c3e50',
              font: {
                size: 14,
              },
            },
            offset: false,
            grid: {
              color: '#ecf0f1',
              drawBorder: false,
              display: true,
            },
            ticks: {
              padding: 8,
              maxRotation: 45,
              minRotation: 45,
            },
          },
          x: {
            display: true,
            beginAtZero: true,
            offset: false,
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              color: '#7f8c8d',
              padding: 10,
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
        interaction: {
          display: true,
          mode: 'nearest',
          intersect: true,
        },
        layout: {
          display: true,
          padding: {
            top: 10,
            bottom: 20,
            right: 0,
            left: 0,
          },
        },
        fill: {
          enabled: true,
          type: 'Smooth',
          color: '#3498db',
          opacity: 0.4,
        },
        responsive: false,
        maintainAspectRatio: true,
        chartType: 'line',
        colors: ['#3498db', '#e74c3c', '#2ecc71'],
        borderColor: ['#2980b9', '#c0392b', '#27ae60'],
        backgroundColor: ['#3498db55', '#e74c3c55', '#2ecc7155'],
        isDefault: true,
        isActive: true,
        isDeleted: false,
        createdAt: '2025-04-10T08:39:51.581Z',
        updatedAt: '2025-04-10T08:40:22.139Z',
      });

      await widgetTheme.save();
      console.info('Widget theme created successfully.');
    }
  } catch (error) {
    console.error('Error updating operators:', error);
    throw error;
  }
}
