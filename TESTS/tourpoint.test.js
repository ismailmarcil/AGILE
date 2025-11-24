/**
 * Test Suite for TourPoint class
 * Tests all functionalities of the TourPoint class
 */

const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const Node = require('../backend/node.js');
const Demand = require('../backend/demand.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: TourPoint Class
describe('TourPoint Class - Constructor and Basic Properties', () => {

    it('should create a pickup point with valid parameters', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, demand);

        assert.strictEqual(tourPoint.node, node);
        assert.strictEqual(tourPoint.type, TypePoint.PICKUP);
        assert.strictEqual(tourPoint.serviceDuration, 300);
        assert.strictEqual(tourPoint.demand, demand);
    });

    it('should create a delivery point with valid parameters', () => {
        const node = new Node('456', 45.76, 4.86, []);
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint(node, TypePoint.DELIVERY, 240, demand);

        assert.strictEqual(tourPoint.type, TypePoint.DELIVERY);
        assert.strictEqual(tourPoint.serviceDuration, 240);
    });

    it('should create a warehouse point without demand', () => {
        const node = new Node('000', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.ENTREPOT, 0, null);

        assert.strictEqual(tourPoint.type, TypePoint.ENTREPOT);
        assert.strictEqual(tourPoint.serviceDuration, 0);
        assert.strictEqual(tourPoint.demand, null);
    });

    it('should use default service duration of 0', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.ENTREPOT);

        assert.strictEqual(tourPoint.serviceDuration, 0);
    });

    it('should use default demand of null', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.ENTREPOT, 0);

        assert.strictEqual(tourPoint.demand, null);
    });

    it('should handle zero service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 0, null);

        assert.strictEqual(tourPoint.serviceDuration, 0);
    });

    it('should handle large service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 9999, null);

        assert.strictEqual(tourPoint.serviceDuration, 9999);
    });
});

describe('TourPoint Class - TypePoint Enum', () => {

    it('should have PICKUP type defined', () => {
        assert.strictEqual(TypePoint.PICKUP, 'PICKUP');
    });

    it('should have DELIVERY type defined', () => {
        assert.strictEqual(TypePoint.DELIVERY, 'DELIVERY');
    });

    it('should have ENTREPOT type defined', () => {
        assert.strictEqual(TypePoint.ENTREPOT, 'ENTREPOT');
    });

    it('should create tour point with each type', () => {
        const node = new Node('123', 45.75, 4.85, []);

        const pickup = new TourPoint(node, TypePoint.PICKUP, 300, null);
        assert.strictEqual(pickup.type, 'PICKUP');

        const delivery = new TourPoint(node, TypePoint.DELIVERY, 240, null);
        assert.strictEqual(delivery.type, 'DELIVERY');

        const warehouse = new TourPoint(node, TypePoint.ENTREPOT, 0, null);
        assert.strictEqual(warehouse.type, 'ENTREPOT');
    });
});

describe('TourPoint Class - toJSON Method', () => {

    it('should return correct JSON representation with all properties', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, demand);

        const json = tourPoint.toJSON();
        assert.isTrue(json.node !== null);
        assert.strictEqual(json.type, TypePoint.PICKUP);
        assert.strictEqual(json.serviceDuration, 300);
        assert.isTrue(json.demand !== null);
    });

    it('should serialize node correctly in JSON', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.node.id, '123');
        assert.strictEqual(json.node.latitude, 45.75);
        assert.strictEqual(json.node.longitude, 4.85);
    });

    it('should serialize demand correctly in JSON', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, demand);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.demand.pickupAddress, '123');
        assert.strictEqual(json.demand.deliveryAddress, '456');
    });

    it('should handle null node in JSON', () => {
        const tourPoint = new TourPoint(null, TypePoint.PICKUP, 300, null);
        const json = tourPoint.toJSON();

        assert.strictEqual(json.node, null);
    });

    it('should handle null demand in JSON', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.ENTREPOT, 0, null);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.demand, null);
    });
});

describe('TourPoint Class - toString Method', () => {

    it('should return correct string representation', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        const str = tourPoint.toString();
        assert.isTrue(str.includes('TourPoint'));
        assert.isTrue(str.includes('PICKUP'));
        assert.isTrue(str.includes('123'));
        assert.isTrue(str.includes('300'));
    });

    it('should format string with TourPoint prefix', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        const str = tourPoint.toString();
        assert.isTrue(str.startsWith('TourPoint'));
    });

    it('should include type in string', () => {
        const node = new Node('123', 45.75, 4.85, []);

        const pickup = new TourPoint(node, TypePoint.PICKUP, 300, null);
        assert.isTrue(pickup.toString().includes('PICKUP'));

        const delivery = new TourPoint(node, TypePoint.DELIVERY, 240, null);
        assert.isTrue(delivery.toString().includes('DELIVERY'));

        const warehouse = new TourPoint(node, TypePoint.ENTREPOT, 0, null);
        assert.isTrue(warehouse.toString().includes('ENTREPOT'));
    });

    it('should include service duration with seconds unit', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        const str = tourPoint.toString();
        assert.isTrue(str.includes('300s'));
    });

    it('should handle null node in string', () => {
        const tourPoint = new TourPoint(null, TypePoint.PICKUP, 300, null);
        const str = tourPoint.toString();

        assert.isTrue(str.includes('?'));
    });
});

describe('TourPoint Class - Edge Cases', () => {

    it('should handle null node', () => {
        const tourPoint = new TourPoint(null, TypePoint.PICKUP, 300, null);
        assert.strictEqual(tourPoint.node, null);
    });

    it('should handle undefined node', () => {
        const tourPoint = new TourPoint(undefined, TypePoint.PICKUP, 300, null);
        assert.strictEqual(tourPoint.node, undefined);
    });

    it('should handle negative service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, -100, null);
        assert.strictEqual(tourPoint.serviceDuration, -100);
    });

    it('should handle decimal service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 123.456, null);
        assert.strictEqual(tourPoint.serviceDuration, 123.456);
    });

    it('should handle NaN service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, NaN, null);
        assert.isTrue(isNaN(tourPoint.serviceDuration));
    });

    it('should handle Infinity service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, Infinity, null);
        assert.strictEqual(tourPoint.serviceDuration, Infinity);
    });

    it('should handle invalid type string', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, 'INVALID_TYPE', 300, null);
        assert.strictEqual(tourPoint.type, 'INVALID_TYPE');
    });
});

describe('TourPoint Class - Mutation Tests', () => {

    it('should allow modification of node', () => {
        const node1 = new Node('123', 45.75, 4.85, []);
        const node2 = new Node('456', 45.76, 4.86, []);
        const tourPoint = new TourPoint(node1, TypePoint.PICKUP, 300, null);

        tourPoint.node = node2;
        assert.strictEqual(tourPoint.node, node2);
    });

    it('should allow modification of type', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        tourPoint.type = TypePoint.DELIVERY;
        assert.strictEqual(tourPoint.type, TypePoint.DELIVERY);
    });

    it('should allow modification of service duration', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        tourPoint.serviceDuration = 600;
        assert.strictEqual(tourPoint.serviceDuration, 600);
    });

    it('should allow modification of demand', () => {
        const node = new Node('123', 45.75, 4.85, []);
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        tourPoint.demand = demand;
        assert.strictEqual(tourPoint.demand, demand);
    });
});

// Export results
module.exports = getResults();

