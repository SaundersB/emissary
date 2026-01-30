/**
 * Example Weather Tool Plugin
 * Demonstrates how to create a custom tool plugin for Emissary
 */

import type { Plugin, PluginContext } from '../../../src/index.js';

export default class WeatherToolPlugin implements Plugin {
  private context!: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('Initializing Weather Tool Plugin');

    // Register the weather tool
    context.registerTool(
      {
        name: 'get_weather',
        description: 'Get the current weather for a city (mock data)',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'The city name',
            },
            units: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              description: 'Temperature units (defaults to celsius)',
            },
          },
          required: ['city'],
        },
      },
      async (params) => {
        try {
          const city = params.city as string;
          const units = (params.units as string) || 'celsius';

          context.logger.info(`Getting weather for: ${city} (${units})`);

          // Mock weather data
          const mockWeather = {
            city,
            temperature: units === 'celsius' ? 22 : 72,
            units,
            condition: 'Partly Cloudy',
            humidity: 65,
            windSpeed: 12,
            forecast: 'Clear skies expected',
          };

          return {
            success: true,
            output: mockWeather,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    context.logger.info('Weather Tool Plugin initialized successfully');
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Cleaning up Weather Tool Plugin');
  }
}
