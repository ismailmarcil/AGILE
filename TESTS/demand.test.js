/**
 * Test Suite for Demand class
 * Tests all functionalities of the Demand class
 */

const Demand = require('../backend/demand.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Demand Class
describe('Demand Class - Constructor and Basic Properties', () => {

    it('should create a demand with valid parameters', () => {
        const demand = new Demand('pickup1', 'delivery1', 300, 240);
        assert.strictEqual(demand.pickupAddress, 'pickup1');
        assert.strictEqual(demand.deliveryAddress, 'delivery1');
        assert.strictEqual(demand.pickupDuration, 300);
        assert.strictEqual(demand.deliveryDuration, 240);
    });

    it('should create a demand with numeric addresses', () => {
        const demand = new Demand(123, 456, 300, 240);
        assert.strictEqual(demand.pickupAddress, 123);
        assert.strictEqual(demand.deliveryAddress, 456);
    });

    it('should handle zero durations', () => {
        const demand = new Demand('p1', 'd1', 0, 0);
        assert.strictEqual(demand.pickupDuration, 0);
        assert.strictEqual(demand.deliveryDuration, 0);
    });

    it('should handle very large durations', () => {
        const demand = new Demand('p1', 'd1', 999999, 999999);
        assert.strictEqual(demand.pickupDuration, 999999);
        assert.strictEqual(demand.deliveryDuration, 999999);
    });

    it('should handle decimal durations', () => {
        const demand = new Demand('p1', 'd1', 123.456, 789.012);
        assert.strictEqual(demand.pickupDuration, 123.456);
        assert.strictEqual(demand.deliveryDuration, 789.012);
    });

    it('should handle negative durations', () => {
        const demand = new Demand('p1', 'd1', -100, -200);
        assert.strictEqual(demand.pickupDuration, -100);
        assert.strictEqual(demand.deliveryDuration, -200);
    });

    it('should handle same address for pickup and delivery', () => {
        const demand = new Demand('addr1', 'addr1', 300, 240);
        assert.strictEqual(demand.pickupAddress, demand.deliveryAddress);
    });

    it('should handle empty string addresses', () => {
        const demand = new Demand('', '', 300, 240);
        assert.strictEqual(demand.pickupAddress, '');
        assert.strictEqual(demand.deliveryAddress, '');
    });
});

describe('Demand Class - Address Validation', () => {

    it('should accept string addresses', () => {
        const demand = new Demand('node123', 'node456', 300, 240);
        assert.strictEqual(typeof demand.pickupAddress, 'string');
        assert.strictEqual(typeof demand.deliveryAddress, 'string');
    });

    it('should accept numeric addresses', () => {
        const demand = new Demand(25175791, 2129259178, 300, 240);
        assert.strictEqual(typeof demand.pickupAddress, 'number');
        assert.strictEqual(typeof demand.deliveryAddress, 'number');
    });

    it('should handle mixed address types', () => {
        const demand = new Demand('node1', 123, 300, 240);
        assert.strictEqual(typeof demand.pickupAddress, 'string');
        assert.strictEqual(typeof demand.deliveryAddress, 'number');
    });

    it('should handle null addresses', () => {
        const demand = new Demand(null, null, 300, 240);
        assert.strictEqual(demand.pickupAddress, null);
        assert.strictEqual(demand.deliveryAddress, null);
    });

    it('should handle undefined addresses', () => {
        const demand = new Demand(undefined, undefined, 300, 240);
        assert.strictEqual(demand.pickupAddress, undefined);
        assert.strictEqual(demand.deliveryAddress, undefined);
    });

    it('should handle special characters in addresses', () => {
        const demand = new Demand('node-123_A', 'node-456_B', 300, 240);
        assert.isTrue(demand.pickupAddress.includes('-'));
        assert.isTrue(demand.pickupAddress.includes('_'));
    });

    it('should handle very long address strings', () => {
        const longAddr = 'node' + '1'.repeat(1000);
        const demand = new Demand(longAddr, longAddr, 300, 240);
        assert.strictEqual(demand.pickupAddress, longAddr);
    });
});

describe('Demand Class - Duration Validation', () => {

    it('should handle typical pickup duration (300s = 5min)', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        assert.strictEqual(demand.pickupDuration, 300);
    });

    it('should handle typical delivery duration (240s = 4min)', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        assert.strictEqual(demand.deliveryDuration, 240);
    });

    it('should handle equal durations', () => {
        const demand = new Demand('p1', 'd1', 300, 300);
        assert.strictEqual(demand.pickupDuration, demand.deliveryDuration);
    });

    it('should handle very different durations', () => {
        const demand = new Demand('p1', 'd1', 60, 3600);
        assert.strictEqual(demand.pickupDuration, 60);
        assert.strictEqual(demand.deliveryDuration, 3600);
    });

    it('should handle NaN durations', () => {
        const demand = new Demand('p1', 'd1', NaN, NaN);
        assert.isTrue(isNaN(demand.pickupDuration));
        assert.isTrue(isNaN(demand.deliveryDuration));
    });

    it('should handle Infinity durations', () => {
        const demand = new Demand('p1', 'd1', Infinity, -Infinity);
        assert.strictEqual(demand.pickupDuration, Infinity);
        assert.strictEqual(demand.deliveryDuration, -Infinity);
    });

    it('should handle string durations (no type checking)', () => {
        const demand = new Demand('p1', 'd1', '300', '240');
        assert.strictEqual(demand.pickupDuration, '300');
        assert.strictEqual(demand.deliveryDuration, '240');
    });
});

describe('Demand Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const demand = new Demand('pickup1', 'delivery1', 300, 240);
        const json = demand.toJSON();
        assert.strictEqual(json.pickupAddress, 'pickup1');
        assert.strictEqual(json.deliveryAddress, 'delivery1');
        assert.strictEqual(json.pickupDuration, 300);
        assert.strictEqual(json.deliveryDuration, 240);
    });

    it('should include all properties in JSON', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        const json = demand.toJSON();
        const keys = Object.keys(json);
        assert.strictEqual(keys.length, 4);
        assert.isTrue(keys.includes('pickupAddress'));
        assert.isTrue(keys.includes('deliveryAddress'));
        assert.isTrue(keys.includes('pickupDuration'));
        assert.isTrue(keys.includes('deliveryDuration'));
    });

    it('should preserve numeric addresses in JSON', () => {
        const demand = new Demand(123, 456, 300, 240);
        const json = demand.toJSON();
        assert.strictEqual(json.pickupAddress, 123);
        assert.strictEqual(json.deliveryAddress, 456);
    });

    it('should handle null values in JSON', () => {
        const demand = new Demand(null, null, 0, 0);
        const json = demand.toJSON();
        assert.strictEqual(json.pickupAddress, null);
        assert.strictEqual(json.deliveryAddress, null);
    });
});

describe('Demand Class - toString Method', () => {

    it('should return correct string representation', () => {
        const demand = new Demand('pickup1', 'delivery1', 300, 240);
        const str = demand.toString();
        assert.isTrue(str.includes('pickup1'), 'String should contain pickup address');
        assert.isTrue(str.includes('delivery1'), 'String should contain delivery address');
        assert.isTrue(str.includes('300'), 'String should contain pickup duration');
        assert.isTrue(str.includes('240'), 'String should contain delivery duration');
    });

    it('should format string with Demand prefix', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        const str = demand.toString();
        assert.isTrue(str.startsWith('Demand'), 'String should start with "Demand"');
    });

    it('should include "Pickup" and "Delivery" keywords', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        const str = demand.toString();
        assert.isTrue(str.includes('Pickup'), 'String should contain "Pickup"');
        assert.isTrue(str.includes('Delivery'), 'String should contain "Delivery"');
    });

    it('should include duration in seconds (s)', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        const str = demand.toString();
        assert.isTrue(str.includes('s)'), 'String should show seconds unit');
    });
});

describe('Demand Class - Mutation Tests', () => {

    it('should allow modification of pickup address', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        demand.pickupAddress = 'p2';
        assert.strictEqual(demand.pickupAddress, 'p2');
    });

    it('should allow modification of delivery address', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        demand.deliveryAddress = 'd2';
        assert.strictEqual(demand.deliveryAddress, 'd2');
    });

    it('should allow modification of pickup duration', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        demand.pickupDuration = 600;
        assert.strictEqual(demand.pickupDuration, 600);
    });

    it('should allow modification of delivery duration', () => {
        const demand = new Demand('p1', 'd1', 300, 240);
        demand.deliveryDuration = 480;
        assert.strictEqual(demand.deliveryDuration, 480);
    });
});

// Export results
module.exports = getResults();

