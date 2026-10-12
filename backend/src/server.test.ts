import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './server.js';
import { loadConfig } from './config.js';

describe('TelePlay Backend Server', () => {
  it('GET /api/health returns 200 and healthy payload', async () => {
    const testConfig = loadConfig();
    testConfig.logLevel = 'silent';
    const app = await buildApp(testConfig);

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'teleplay-backend');
    assert.equal(body.version, '0.1.0');
    assert.ok(typeof body.timestamp === 'string');
    assert.ok(typeof body.uptimeSeconds === 'number');

    await app.close();
  });

  it('GET /non-existent returns 404', async () => {
    const testConfig = loadConfig();
    testConfig.logLevel = 'silent';
    const app = await buildApp(testConfig);

    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route',
    });

    assert.equal(response.statusCode, 404);
    await app.close();
  });
});

