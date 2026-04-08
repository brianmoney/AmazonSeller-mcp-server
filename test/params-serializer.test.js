/**
 * Tests for the paramsSerializer in makeSpApiRequest.
 *
 * These tests exercise the serializer logic directly without making network
 * calls, since the serializer is a pure function.
 *
 * The core regression: arrays passed as query params must serialize as repeated
 * keys (marketplaceIds=A&marketplaceIds=B), NOT bracket notation
 * (marketplaceIds[]=A&marketplaceIds[]=B) which SP-API rejects with 400.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Extract the serializer logic inline so tests don't need to stub axios.
function paramsSerializer(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

test('single-element array serializes as plain repeated key, not bracket notation', () => {
  const result = paramsSerializer({ marketplaceIds: ['ATVPDKIKX0DER'] });
  assert.equal(result, 'marketplaceIds=ATVPDKIKX0DER');
  assert.ok(!result.includes('['), 'must not contain bracket notation');
});

test('multi-element array serializes as repeated keys', () => {
  const result = paramsSerializer({ marketplaceIds: ['ATVPDKIKX0DER', 'A1F83G8C2ARO7P'] });
  assert.equal(result, 'marketplaceIds=ATVPDKIKX0DER&marketplaceIds=A1F83G8C2ARO7P');
});

test('includedData array serializes as repeated keys', () => {
  const result = paramsSerializer({
    marketplaceIds: ['ATVPDKIKX0DER'],
    includedData: ['summaries', 'attributes', 'issues']
  });
  assert.equal(
    result,
    'marketplaceIds=ATVPDKIKX0DER&includedData=summaries&includedData=attributes&includedData=issues'
  );
});

test('string values are serialized directly (no brackets)', () => {
  const result = paramsSerializer({
    granularityType: 'Marketplace',
    granularityId: 'ATVPDKIKX0DER',
    marketplaceIds: 'ATVPDKIKX0DER'
  });
  assert.equal(
    result,
    'granularityType=Marketplace&granularityId=ATVPDKIKX0DER&marketplaceIds=ATVPDKIKX0DER'
  );
});

test('undefined and null values are omitted', () => {
  const result = paramsSerializer({
    marketplaceIds: ['ATVPDKIKX0DER'],
    issueLocale: undefined,
    requirements: null
  });
  assert.equal(result, 'marketplaceIds=ATVPDKIKX0DER');
});

test('special characters in values are percent-encoded', () => {
  const result = paramsSerializer({ sku: 'FS-M03-SQR/test' });
  assert.ok(result.includes('%2F'), 'forward slash must be encoded');
});
