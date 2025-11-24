/**
 * Test Suite for Segment class
 * Tests all functionalities of the Segment class
 */

const Segment = require('../backend/segment.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Segment Class
describe('Segment Class - Constructor and Basic Properties', () => {

    it('should create a segment with valid parameters', () => {
        const segment = new Segment('node1', 'node2', 'Main Street', 150.5);
        assert.strictEqual(segment.origin, 'node1');
        assert.strictEqual(segment.destination, 'node2');
        assert.strictEqual(segment.streetName, 'Main Street');
        assert.strictEqual(segment.length, 150.5);
    });

    it('should create a segment with numeric ids', () => {
        const segment = new Segment(123, 456, 'Avenue', 200);
        assert.strictEqual(segment.origin, 123);
        assert.strictEqual(segment.destination, 456);
    });

    it('should handle empty street name', () => {
        const segment = new Segment('a', 'b', '', 100);
        assert.strictEqual(segment.streetName, '');
    });

    it('should handle zero length', () => {
        const segment = new Segment('x', 'y', 'Street', 0);
        assert.strictEqual(segment.length, 0);
    });

    it('should handle very long street name', () => {
        const longName = 'Very Long Street Name With Many Words '.repeat(10);
        const segment = new Segment('a', 'b', longName, 100);
        assert.strictEqual(segment.streetName, longName);
    });

    it('should handle special characters in street name', () => {
        const segment = new Segment('a', 'b', 'Rue de l\'Église - Côté Est', 100);
        assert.isTrue(segment.streetName.includes('Église'));
    });

    it('should handle decimal length', () => {
        const segment = new Segment('a', 'b', 'Street', 123.456789);
        assert.strictEqual(segment.length, 123.456789);
    });

    it('should handle very large length', () => {
        const segment = new Segment('a', 'b', 'Highway', 999999.99);
        assert.strictEqual(segment.length, 999999.99);
    });
});

describe('Segment Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const segment = new Segment('node1', 'node2', 'Main Street', 150.5);
        const json = segment.toJSON();
        assert.strictEqual(json.origin, 'node1');
        assert.strictEqual(json.destination, 'node2');
        assert.strictEqual(json.streetName, 'Main Street');
        assert.strictEqual(json.length, 150.5);
    });

    it('should include all properties in JSON', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        const json = segment.toJSON();
        const keys = Object.keys(json);
        assert.strictEqual(keys.length, 4);
        assert.isTrue(keys.includes('origin'));
        assert.isTrue(keys.includes('destination'));
        assert.isTrue(keys.includes('streetName'));
        assert.isTrue(keys.includes('length'));
    });

    it('should handle empty street name in JSON', () => {
        const segment = new Segment('a', 'b', '', 100);
        const json = segment.toJSON();
        assert.strictEqual(json.streetName, '');
    });

    it('should preserve numeric ids in JSON', () => {
        const segment = new Segment(123, 456, 'Street', 100);
        const json = segment.toJSON();
        assert.strictEqual(json.origin, 123);
        assert.strictEqual(json.destination, 456);
    });
});

describe('Segment Class - toString Method', () => {

    it('should return correct string representation', () => {
        const segment = new Segment('node1', 'node2', 'Main Street', 150.5);
        const str = segment.toString();
        assert.isTrue(str.includes('node1'), 'String should contain origin');
        assert.isTrue(str.includes('node2'), 'String should contain destination');
        assert.isTrue(str.includes('Main Street'), 'String should contain street name');
        assert.isTrue(str.includes('150.5'), 'String should contain length');
    });

    it('should format string with Segment prefix', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        const str = segment.toString();
        assert.isTrue(str.startsWith('Segment '), 'String should start with "Segment "');
    });

    it('should include arrow between origin and destination', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        const str = segment.toString();
        assert.isTrue(str.includes('→'), 'String should contain arrow');
    });

    it('should include length with meter unit', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        const str = segment.toString();
        assert.isTrue(str.includes('100m'), 'String should contain length with m unit');
    });

    it('should handle empty street name in string', () => {
        const segment = new Segment('a', 'b', '', 100);
        const str = segment.toString();
        assert.isTrue(str.length > 0, 'String should not be empty');
    });

    it('should format decimal length correctly', () => {
        const segment = new Segment('a', 'b', 'Street', 123.456);
        const str = segment.toString();
        assert.isTrue(str.includes('123.456'), 'String should contain full decimal length');
    });
});

describe('Segment Class - Edge Cases', () => {

    it('should handle same origin and destination', () => {
        const segment = new Segment('node1', 'node1', 'Loop', 0);
        assert.strictEqual(segment.origin, segment.destination);
    });

    it('should handle null street name', () => {
        const segment = new Segment('a', 'b', null, 100);
        assert.strictEqual(segment.streetName, null);
    });

    it('should handle undefined street name', () => {
        const segment = new Segment('a', 'b', undefined, 100);
        assert.strictEqual(segment.streetName, undefined);
    });

    it('should handle negative length', () => {
        const segment = new Segment('a', 'b', 'Street', -100);
        assert.strictEqual(segment.length, -100);
    });

    it('should handle NaN length', () => {
        const segment = new Segment('a', 'b', 'Street', NaN);
        assert.isTrue(isNaN(segment.length));
    });

    it('should handle Infinity length', () => {
        const segment = new Segment('a', 'b', 'Street', Infinity);
        assert.strictEqual(segment.length, Infinity);
    });
});

describe('Segment Class - Mutation Tests', () => {

    it('should allow modification of origin', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        segment.origin = 'c';
        assert.strictEqual(segment.origin, 'c');
    });

    it('should allow modification of destination', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        segment.destination = 'd';
        assert.strictEqual(segment.destination, 'd');
    });

    it('should allow modification of street name', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        segment.streetName = 'New Street';
        assert.strictEqual(segment.streetName, 'New Street');
    });

    it('should allow modification of length', () => {
        const segment = new Segment('a', 'b', 'Street', 100);
        segment.length = 200;
        assert.strictEqual(segment.length, 200);
    });
});

describe('Segment Class - Type Tests', () => {

    it('should accept string type for origin and destination', () => {
        const segment = new Segment('node1', 'node2', 'Street', 100);
        assert.strictEqual(typeof segment.origin, 'string');
        assert.strictEqual(typeof segment.destination, 'string');
    });

    it('should accept number type for origin and destination', () => {
        const segment = new Segment(123, 456, 'Street', 100);
        assert.strictEqual(typeof segment.origin, 'number');
        assert.strictEqual(typeof segment.destination, 'number');
    });

    it('should accept mixed types for origin and destination', () => {
        const segment = new Segment('node1', 456, 'Street', 100);
        assert.strictEqual(typeof segment.origin, 'string');
        assert.strictEqual(typeof segment.destination, 'number');
    });
});

// Export results
module.exports = getResults();

