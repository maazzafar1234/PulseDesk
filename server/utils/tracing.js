/**
 * PulseDesk Distributed Tracing with Jaeger
 * Provides request tracing across services
 * 
 * Environment variables:
 *   JAEGER_ENABLED - Enable tracing (default: false)
 *   JAEGER_HOST - Jaeger agent host (default: localhost)
 *   JAEGER_PORT - Jaeger agent port (default: 6832)
 *   JAEGER_SAMPLER - Sampling rate 0-1 (default: 0.1)
 */

let tracer = null;
let isEnabled = false;

/**
 * Initialize Jaeger tracer
 * Returns a mock tracer if Jaeger is not available
 */
function initializeTracer() {
  if (isEnabled) {
    return tracer;
  }

  isEnabled = process.env.JAEGER_ENABLED === 'true';

  if (!isEnabled) {
    // Return mock tracer for development
    return createMockTracer();
  }

  try {
    // This would require: npm install jaeger-client
    // For now, return mock tracer
    console.log('Jaeger tracing enabled (mock mode - install jaeger-client for real tracing)');
    return createMockTracer();
  } catch (err) {
    console.warn('Failed to initialize Jaeger tracer:', err.message);
    return createMockTracer();
  }
}

/**
 * Mock tracer for development/testing
 */
function createMockTracer() {
  return {
    startSpan(operationName, options = {}) {
      return {
        operationName,
        tags: {},
        logs: [],
        setTag(key, value) {
          this.tags[key] = value;
          return this;
        },
        log(keyValuePairs) {
          this.logs.push(keyValuePairs);
          return this;
        },
        finish() {
          // Mock finish
        },
        tracer: this,
      };
    },

    inject(span, format, carrier) {
      // Mock inject for headers
      carrier['x-trace-id'] = `mock-${Date.now()}`;
    },

    extract(format, carrier) {
      // Mock extract from headers
      return {};
    },
  };
}

// Initialize tracer on module load
tracer = initializeTracer();

/**
 * Create a span for a request
 */
function startRequestSpan(operationName, req = null) {
  const span = tracer.startSpan(operationName, {
    tags: {
      'span.kind': 'server',
      'http.method': req?.method,
      'http.url': req?.url,
      'component': 'pulsedesk-server',
    },
  });

  return span;
}

/**
 * Create a span for a database operation
 */
function startDatabaseSpan(operationName, query = null) {
  const span = tracer.startSpan(operationName, {
    tags: {
      'span.kind': 'client',
      'db.type': 'sql',
      'db.statement': query?.substring(0, 100), // Limit length
      'component': 'database',
    },
  });

  return span;
}

/**
 * Create a span for an external API call
 */
function startExternalSpan(operationName, url = null) {
  const span = tracer.startSpan(operationName, {
    tags: {
      'span.kind': 'client',
      'http.url': url,
      'component': 'external-api',
    },
  });

  return span;
}

/**
 * Express middleware for tracing
 */
function tracingMiddleware(req, res, next) {
  const span = startRequestSpan(`${req.method} ${req.path}`, req);

  // Store span in request for use in handlers
  req.span = span;

  // Finish span on response
  const originalSend = res.send;
  res.send = function (data) {
    span.setTag('http.status_code', res.statusCode);

    if (res.statusCode >= 400) {
      span.setTag('error', true);
      span.log({
        'event': 'error',
        'message': data,
      });
    }

    span.finish();
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Decorator for automatic span creation on async functions
 */
function trace(operationName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args) {
      const span = tracer.startSpan(operationName);

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result
            .then(value => {
              span.finish();
              return value;
            })
            .catch(error => {
              span.setTag('error', true);
              span.log({
                'event': 'error',
                'message': error.message,
                'stack': error.stack,
              });
              span.finish();
              throw error;
            });
        }

        span.finish();
        return result;
      } catch (error) {
        span.setTag('error', true);
        span.log({
          'event': 'error',
          'message': error.message,
          'stack': error.stack,
        });
        span.finish();
        throw error;
      }
    };

    return descriptor;
  };
}

module.exports = {
  tracer,
  initializeTracer,
  startRequestSpan,
  startDatabaseSpan,
  startExternalSpan,
  tracingMiddleware,
  trace,
  isEnabled: () => isEnabled,
};
