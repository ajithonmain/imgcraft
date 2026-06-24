const spec = {
  openapi: '3.1.0',
  info: {
    title: 'imgcraft API',
    version: '1.0.0',
    description:
      'Image transform pipeline — compress, resize, convert, AI ops. Rate limits: 10/min, 50/day per IP.',
  },
  servers: [{ url: 'https://imgcraft-api.imgcraft.workers.dev' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    version: { type: 'string', example: '1.0.0' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/info': {
      post: {
        summary: 'Read image metadata',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file max 10MB',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Image metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    width: { type: 'number', example: 3024 },
                    height: { type: 'number', example: 4032 },
                    format: { type: 'string', example: 'jpeg' },
                    size: { type: 'number', example: 3621944 },
                    hasAlpha: { type: 'boolean', example: false },
                    channels: { type: 'number', example: 3 },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid request' },
          '413': { description: 'File too large (max 10MB)' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/transform': {
      post: {
        summary: 'Transform image',
        description: 'Apply a pipeline of operations. Rate limits: 10/min, 50/day. AI ops: 10/day.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image', 'ops'],
                properties: {
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file, max 10MB',
                  },
                  ops: {
                    type: 'string',
                    description: 'JSON array of operations',
                    example:
                      '[{"op":"resize","options":{"width":800}},{"op":"compress","options":{"quality":85}}]',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Processed image bytes',
            content: {
              'image/webp': { schema: { type: 'string', format: 'binary' } },
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
              'image/png': { schema: { type: 'string', format: 'binary' } },
              'image/avif': { schema: { type: 'string', format: 'binary' } },
            },
          },
          '400': { description: 'Invalid ops schema' },
          '413': { description: 'File too large' },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: {
                      type: 'string',
                      enum: ['RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_DAY_EXCEEDED', 'RATE_LIMIT_AI_EXCEEDED'],
                    },
                    retryAfter: { type: 'number' },
                  },
                },
              },
            },
          },
          '504': { description: 'Processing timeout (30s)' },
        },
      },
    },
  },
  components: {
    schemas: {
      ResizeOp: {
        type: 'object',
        required: ['op'],
        properties: {
          op: { type: 'string', enum: ['resize'] },
          width: { type: 'number', example: 800 },
          height: { type: 'number', example: 600 },
          fit: {
            type: 'string',
            enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
            default: 'cover',
          },
        },
      },
      CompressOp: {
        type: 'object',
        required: ['op'],
        properties: {
          op: { type: 'string', enum: ['compress'] },
          options: {
            type: 'object',
            properties: {
              quality: { type: 'number', minimum: 1, maximum: 100, default: 80, example: 85 },
              format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'], default: 'webp' },
              effort: { type: 'number', minimum: 0, maximum: 9, default: 6 },
            },
          },
        },
      },
      FormatOp: {
        type: 'object',
        required: ['op', 'format'],
        properties: {
          op: { type: 'string', enum: ['format'] },
          format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
        },
      },
      RotateOp: {
        type: 'object',
        required: ['op', 'angle'],
        properties: {
          op: { type: 'string', enum: ['rotate'] },
          angle: { type: 'number', enum: [0, 90, 180, 270] },
        },
      },
      CropOp: {
        type: 'object',
        required: ['op', 'left', 'top', 'width', 'height'],
        properties: {
          op: { type: 'string', enum: ['crop'] },
          left: { type: 'number' },
          top: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
      GrayscaleOp: {
        type: 'object',
        required: ['op'],
        properties: { op: { type: 'string', enum: ['grayscale'] } },
      },
      FlipOp: {
        type: 'object',
        required: ['op'],
        properties: { op: { type: 'string', enum: ['flip'] } },
      },
      FlopOp: {
        type: 'object',
        required: ['op'],
        properties: { op: { type: 'string', enum: ['flop'] } },
      },
      BlurOp: {
        type: 'object',
        required: ['op'],
        properties: {
          op: { type: 'string', enum: ['blur'] },
          sigma: { type: 'number', minimum: 0.3, maximum: 1000 },
        },
      },
      SharpenOp: {
        type: 'object',
        required: ['op'],
        properties: { op: { type: 'string', enum: ['sharpen'] } },
      },
      NegateOp: {
        type: 'object',
        required: ['op'],
        properties: { op: { type: 'string', enum: ['negate'] } },
      },
      BrightnessOp: {
        type: 'object',
        required: ['op', 'factor'],
        properties: {
          op: { type: 'string', enum: ['brightness'] },
          factor: { type: 'number', example: 1.2 },
        },
      },
      ContrastOp: {
        type: 'object',
        required: ['op', 'factor'],
        properties: {
          op: { type: 'string', enum: ['contrast'] },
          factor: { type: 'number', example: 1.1 },
        },
      },
      SaturationOp: {
        type: 'object',
        required: ['op', 'factor'],
        properties: {
          op: { type: 'string', enum: ['saturation'] },
          factor: { type: 'number', example: 1.3 },
        },
      },
    },
  },
}

export default spec
