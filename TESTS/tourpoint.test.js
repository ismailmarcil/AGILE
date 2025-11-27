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
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, demand);

        assert.strictEqual(tourPoint.id, '123');
        assert.strictEqual(tourPoint.latitude, 45.75);
        assert.strictEqual(tourPoint.longitude, 4.85);
        assert.strictEqual(tourPoint.type, TypePoint.PICKUP);
        assert.strictEqual(tourPoint.serviceDuration, 300);
        assert.strictEqual(tourPoint.demand, demand);
    });

    it('should create a delivery point with valid parameters', () => {
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint('456', 45.76, 4.86, [], TypePoint.DELIVERY, 240, demand);

        assert.strictEqual(tourPoint.id, '456');
        assert.strictEqual(tourPoint.type, TypePoint.DELIVERY);
        assert.strictEqual(tourPoint.serviceDuration, 240);
    });

    it('should create a warehouse point without demand', () => {
        const tourPoint = new TourPoint('000', 45.75, 4.85, [], TypePoint.ENTREPOT, 0, null);

        assert.strictEqual(tourPoint.id, '000');
        assert.strictEqual(tourPoint.type, TypePoint.ENTREPOT);
        assert.strictEqual(tourPoint.serviceDuration, 0);
        assert.strictEqual(tourPoint.demand, null);
    });

    it('should use default service duration of 0', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.ENTREPOT);

        assert.strictEqual(tourPoint.serviceDuration, 0);
    });

    it('should use default demand of null', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.ENTREPOT, 0);

        assert.strictEqual(tourPoint.demand, null);
    });

    it('should handle zero service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 0, null);

        assert.strictEqual(tourPoint.serviceDuration, 0);
    });

    it('should handle large service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 9999, null);

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
        const pickup = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);
        assert.strictEqual(pickup.type, 'PICKUP');

        const delivery = new TourPoint('123', 45.75, 4.85, [], TypePoint.DELIVERY, 240, null);
        assert.strictEqual(delivery.type, 'DELIVERY');

        const warehouse = new TourPoint('123', 45.75, 4.85, [], TypePoint.ENTREPOT, 0, null);
        assert.strictEqual(warehouse.type, 'ENTREPOT');
    });
});

describe('TourPoint Class - toJSON Method', () => {

    it('should return correct JSON representation with all properties', () => {
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, demand);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.id, '123');
        assert.strictEqual(json.latitude, 45.75);
        assert.strictEqual(json.longitude, 4.85);
        assert.strictEqual(json.type, TypePoint.PICKUP);
        assert.strictEqual(json.serviceDuration, 300);
        assert.isTrue(json.demand !== null);
    });

    it('should serialize coordinates correctly in JSON', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.id, '123');
        assert.strictEqual(json.latitude, 45.75);
        assert.strictEqual(json.longitude, 4.85);
    });

    it('should serialize demand correctly in JSON', () => {
        const pickup = new Node('123', 45.75, 4.85, []);
        const delivery = new Node('456', 45.76, 4.86, []);
        const demand = new Demand(pickup, delivery, 300, 240, 'D1');
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, demand);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.demand.pickupAddress, '123');
        assert.strictEqual(json.demand.deliveryAddress, '456');
    });

    it('should handle null demand in JSON', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.ENTREPOT, 0, null);

        const json = tourPoint.toJSON();
        assert.strictEqual(json.demand, null);
    });
});

describe('TourPoint Class - toString Method', () => {

    it('should return correct string representation', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        const str = tourPoint.toString();
        assert.isTrue(str.includes('TourPoint'));
        assert.isTrue(str.includes('PICKUP'));
        assert.isTrue(str.includes('123'));
        assert.isTrue(str.includes('300'));
    });

    it('should format string with TourPoint prefix', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        const str = tourPoint.toString();
        assert.isTrue(str.startsWith('TourPoint'));
    });

    it('should include type in string', () => {
        const pickup = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);
        assert.isTrue(pickup.toString().includes('PICKUP'));

        const delivery = new TourPoint('123', 45.75, 4.85, [], TypePoint.DELIVERY, 240, null);
        assert.isTrue(delivery.toString().includes('DELIVERY'));

        const warehouse = new TourPoint('123', 45.75, 4.85, [], TypePoint.ENTREPOT, 0, null);
        assert.isTrue(warehouse.toString().includes('ENTREPOT'));
    });

    it('should include service duration with seconds unit', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        const str = tourPoint.toString();
        assert.isTrue(str.includes('300s'));
    });

});

describe('TourPoint Class - Edge Cases', () => {

    it('should handle negative service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, -100, null);
        assert.strictEqual(tourPoint.serviceDuration, -100);
    });

    it('should handle decimal service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 123.456, null);
        assert.strictEqual(tourPoint.serviceDuration, 123.456);
    });

    it('should handle NaN service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, NaN, null);
        assert.isTrue(isNaN(tourPoint.serviceDuration));
    });

    it('should handle Infinity service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, Infinity, null);
        assert.strictEqual(tourPoint.serviceDuration, Infinity);
    });

    it('should handle invalid type string', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], 'INVALID_TYPE', 300, null);
        assert.strictEqual(tourPoint.type, 'INVALID_TYPE');
    });
});

describe('TourPoint Class - Mutation Tests', () => {

    it('should allow modification of type', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        tourPoint.type = TypePoint.DELIVERY;
        assert.strictEqual(tourPoint.type, TypePoint.DELIVERY);
    });

    it('should allow modification of service duration', () => {
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        tourPoint.serviceDuration = 600;
        assert.strictEqual(tourPoint.serviceDuration, 600);
    });

    it('should allow modification of demand', () => {
        const demand = new Demand('123', '456', 300, 240);
        const tourPoint = new TourPoint('123', 45.75, 4.85, [], TypePoint.PICKUP, 300, null);

        tourPoint.demand = demand;
        assert.strictEqual(tourPoint.demand, demand);
    });
});

// Export results
module.exports = getResults();

