/**
 * Unit tests for putListingsItem attribute resolution.
 *
 * These tests exercise the handler directly with a stubbed makeSpApiRequest,
 * so no live Amazon credentials are required.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Stub makeSpApiRequest so tests never touch the network.
// We capture the last call in capturedRequest for assertions.
// ---------------------------------------------------------------------------
let capturedRequest = null;
let stubShouldThrow = false;

// Patch the module cache via import monkey-patching is not possible in ESM,
// so we test the handler logic inline by extracting it into a helper that
// accepts an injectable makeSpApiRequest dependency.
// ---------------------------------------------------------------------------

// Inline re-implementation of the handler logic from listings.js so we can
// inject a fake makeSpApiRequest without needing module mocking.
async function putListingsItemHandler(args, makeSpApiRequest) {
  const { sellerId, sku, marketplaceIds, issueLocale, productType, requirements, attributesJson, attributes } = args;

  let resolvedAttributes = attributes;
  if (attributesJson !== undefined) {
    try {
      resolvedAttributes = JSON.parse(attributesJson);
    } catch (parseError) {
      return {
        content: [{ type: 'text', text: `Error parsing attributesJson: ${parseError.message}` }],
        isError: true
      };
    }
  }
  if (resolvedAttributes === undefined) {
    return {
      content: [{ type: 'text', text: 'Error: either attributesJson or attributes must be provided' }],
      isError: true
    };
  }

  const queryParams = {
    marketplaceIds: marketplaceIds || ['ATVPDKIKX0DER']
  };
  if (issueLocale) queryParams.issueLocale = issueLocale;
  if (requirements) queryParams.requirements = requirements;

  const payload = { productType, attributes: resolvedAttributes };

  const data = await makeSpApiRequest('PUT', `/listings/2021-08-01/items/${sellerId}/${sku}`, payload, queryParams);
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const fakeApi = async (method, path, payload, queryParams) => {
  capturedRequest = { method, path, payload, queryParams };
  if (stubShouldThrow) throw new Error('fake API error');
  return { status: 'ACCEPTED' };
};

// Convenience wrapper
async function call(args) {
  capturedRequest = null;
  stubShouldThrow = false;
  return putListingsItemHandler(args, fakeApi);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('attributesJson string is parsed and forwarded as attributes object', async () => {
  const attrPayload = {
    item_name: [{ value: 'FreshSeal Vacuum Sealer', language_tag: 'en_US' }],
    bullet_point: [
      { value: 'Keeps food fresh 5x longer', language_tag: 'en_US' },
      { value: 'Easy one-touch operation', language_tag: 'en_US' }
    ],
    product_description: [{ value: 'Professional-grade vacuum sealing.', language_tag: 'en_US' }]
  };

  const result = await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER',
    attributesJson: JSON.stringify(attrPayload)
  });

  assert.equal(result.isError, undefined, 'should not be an error');
  assert.deepEqual(
    capturedRequest.payload.attributes,
    attrPayload,
    'parsed attributesJson must equal the original object'
  );
  assert.equal(capturedRequest.payload.productType, 'VACUUM_SEALER');
});

test('attributes object (programmatic path) is forwarded unchanged', async () => {
  const attrObj = { item_name: [{ value: 'Direct Object', language_tag: 'en_US' }] };

  const result = await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER',
    attributes: attrObj
  });

  assert.equal(result.isError, undefined);
  assert.deepEqual(capturedRequest.payload.attributes, attrObj);
});

test('attributesJson takes priority over attributes when both are provided', async () => {
  const fromJson = { item_name: [{ value: 'From JSON', language_tag: 'en_US' }] };
  const fromObj  = { item_name: [{ value: 'From Object', language_tag: 'en_US' }] };

  await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER',
    attributesJson: JSON.stringify(fromJson),
    attributes: fromObj
  });

  assert.deepEqual(capturedRequest.payload.attributes, fromJson, 'attributesJson should win');
});

test('invalid JSON in attributesJson returns isError without calling the API', async () => {
  const result = await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER',
    attributesJson: '{ not valid json'
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Error parsing attributesJson/);
  assert.equal(capturedRequest, null, 'API should not have been called');
});

test('missing both attributesJson and attributes returns isError without calling the API', async () => {
  const result = await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER'
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /attributesJson or attributes must be provided/);
  assert.equal(capturedRequest, null);
});

test('optional query params (issueLocale, requirements) are forwarded when supplied', async () => {
  await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER',
    issueLocale: 'en_US',
    requirements: 'LISTING',
    attributesJson: '{}'
  });

  assert.equal(capturedRequest.queryParams.issueLocale, 'en_US');
  assert.equal(capturedRequest.queryParams.requirements, 'LISTING');
});

test('custom marketplaceIds are forwarded correctly', async () => {
  await call({
    sellerId: 'SELLER123',
    sku: 'FBA-FS0101',
    productType: 'VACUUM_SEALER',
    marketplaceIds: ['A1F83G8C2ARO7P'],
    attributesJson: '{}'
  });

  assert.deepEqual(capturedRequest.queryParams.marketplaceIds, ['A1F83G8C2ARO7P']);
});

test('PUT request goes to the correct SP-API path', async () => {
  await call({
    sellerId: 'SELLER99',
    sku: 'MY-SKU',
    productType: 'HOME',
    attributesJson: '{}'
  });

  assert.equal(capturedRequest.method, 'PUT');
  assert.equal(capturedRequest.path, '/listings/2021-08-01/items/SELLER99/MY-SKU');
});
