import { Schema } from 'ajv';

const frameworkSchema: Schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    dependencies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          import: {
            anyOf: [
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              {
                type: 'object',
                properties: {
                  source: {
                    type: 'string',
                    enum: ['*', 'default'],
                  },
                  name: {
                    type: 'string',
                  },
                },
              },
            ],
          },
          from: {
            type: 'string',
          },
        },
      },
    },
    external: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    handlers: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
  },
};
export const configurationSchema: Schema = {
  type: 'object',
  properties: {
    framework: {
      anyOf: [
        {
          type: 'string',
        },
        frameworkSchema,
      ],
      default: 'react',
    },
    frameworks: {
      type: 'object',
      additionalProperties: frameworkSchema,
    },
    bundler: {
      anyOf: [
        {
          type: 'string',
        },
        {
          function: true,
        },
      ],
      default: 'esbuild',
    },
    bundlers: {
      type: 'object',
      additionalProperties: {
        function: true,
      },
    },
    globals: {
      type: 'object',
      additionalProperties: true,
    },
    logLevel: {
      type: 'string',
      enum: ['error', 'warn', 'info', 'debug', 'verbose'],
      default: 'warn',
    },
    viewsSetup: {
      type: 'object',
      properties: {
        layout: {
          type: 'string',
          enum: ['default', 'full-width', 'full-screen'],
        },
      },
      additionalProperties: true,
    },
  },
  required: [],
  additionalProperties: false,
};
export const rootConfigurationSchema: Schema = {
  ...configurationSchema,
  type: 'object',
  properties: {
    ...configurationSchema.properties,
    devServer: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          default: 3000,
        },
        host: {
          type: 'string',
          default: 'localhost',
        },
      },
      required: ['port', 'host'],
    },
  },
  required: ['devServer', 'framework', 'bundler', ...configurationSchema.required],
  additionalProperties: false,
};
