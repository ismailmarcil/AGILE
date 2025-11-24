/**
 * Test Suite for Tour class
 * Tests all functionalities of the Tour class
 */

const Tour = require('../backend/tours.js');
const Courier = require('../backend/courier.js');
const { TourPoint, TypePoint } = require('../backend/tourpoint.js');
const Node = require('../backend/node.js');
const Demand = require('../backend/demand.js');
const Segment = require('../backend/segment.js');
const { describe, it, assert, getResults } = require('./testFramework.js');

// Test Suite: Tour Class
describe('Tour Class - Constructor and Basic Properties', () => {

    it('should create a tour with valid parameters', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        assert.strictEqual(tour.departureTime, '08:00');
        assert.strictEqual(tour.courier, courier);
        assert.strictEqual(tour.pickupDeliveryPointsList.length, 0);
        assert.strictEqual(tour.itinerary.length, 0);
        assert.strictEqual(tour.totalDuration, 0);
        assert.strictEqual(tour.totalDistance, 0);
    });

    it('should initialize with empty pickup/delivery points list', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        assert.isTrue(Array.isArray(tour.pickupDeliveryPointsList));
        assert.strictEqual(tour.pickupDeliveryPointsList.length, 0);
    });

    it('should initialize with empty itinerary', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        assert.isTrue(Array.isArray(tour.itinerary));
        assert.strictEqual(tour.itinerary.length, 0);
    });

    it('should handle different time formats', () => {
        const courier = new Courier('C001', 'John Doe');

        const tour1 = new Tour('08:00', courier);
        assert.strictEqual(tour1.departureTime, '08:00');

        const tour2 = new Tour('14:30', courier);
        assert.strictEqual(tour2.departureTime, '14:30');

        const tour3 = new Tour('23:59', courier);
        assert.strictEqual(tour3.departureTime, '23:59');
    });

    it('should handle null courier', () => {
        const tour = new Tour('08:00', null);
        assert.strictEqual(tour.courier, null);
    });
});

describe('Tour Class - addPoint Method', () => {

    it('should add a pickup point to the tour', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const demand = new Demand('1', '2', 300, 240);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, demand);

        tour.addPoint(tourPoint, '08:10', '08:15');

        assert.strictEqual(tour.pickupDeliveryPointsList.length, 1);
    });

    it('should add multiple points to the tour', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const demand = new Demand('1', '2', 300, 240);

        const pickup = new TourPoint(node1, TypePoint.PICKUP, 300, demand);
        const delivery = new TourPoint(node2, TypePoint.DELIVERY, 240, demand);

        tour.addPoint(pickup, '08:10', '08:15');
        tour.addPoint(delivery, '08:30', '08:34');

        assert.strictEqual(tour.pickupDeliveryPointsList.length, 2);
    });

    it('should store arrival and departure times for each point', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        tour.addPoint(tourPoint, '08:10', '08:15');

        const addedPoint = tour.pickupDeliveryPointsList[0];
        assert.strictEqual(addedPoint.arrivalTime, '08:10');
        assert.strictEqual(addedPoint.departureTime, '08:15');
        assert.strictEqual(addedPoint.tourPoint, tourPoint);
    });
});

describe('Tour Class - calculateTimeDifference Method', () => {

    it('should calculate difference between two times', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const diff = tour.calculateTimeDifference('08:00', '09:00');
        assert.strictEqual(diff, 60);
    });

    it('should calculate difference for same time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const diff = tour.calculateTimeDifference('08:00', '08:00');
        assert.strictEqual(diff, 0);
    });

    it('should calculate difference with minutes', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const diff = tour.calculateTimeDifference('08:15', '08:45');
        assert.strictEqual(diff, 30);
    });

    it('should return absolute difference', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const diff1 = tour.calculateTimeDifference('08:00', '09:00');
        const diff2 = tour.calculateTimeDifference('09:00', '08:00');
        assert.strictEqual(diff1, diff2);
    });

    it('should handle times crossing hours', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const diff = tour.calculateTimeDifference('08:50', '09:10');
        assert.strictEqual(diff, 20);
    });

    it('should handle multi-hour differences', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const diff = tour.calculateTimeDifference('08:00', '12:30');
        assert.strictEqual(diff, 270);
    });
});

describe('Tour Class - calculateTotalDuration Method', () => {

    it('should return 0 for tour with no points', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const duration = tour.calculateTotalDuration();
        assert.strictEqual(duration, 0);
    });

    it('should calculate duration from departure to last point', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const demand = new Demand('1', '2', 300, 240);

        const pickup = new TourPoint(node1, TypePoint.PICKUP, 300, demand);
        const delivery = new TourPoint(node2, TypePoint.DELIVERY, 240, demand);

        tour.addPoint(pickup, '08:10', '08:15');
        tour.addPoint(delivery, '08:30', '08:34');

        const duration = tour.calculateTotalDuration();
        assert.strictEqual(duration, 34); // From 08:00 to 08:34
    });

    it('should update totalDuration property', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);

        tour.addPoint(tourPoint, '08:10', '08:15');
        tour.calculateTotalDuration();

        assert.strictEqual(tour.totalDuration, 15);
    });
});

describe('Tour Class - calculateTotalDistance Method', () => {

    it('should return 0 for tour with empty itinerary', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const distance = tour.calculateTotalDistance();
        assert.strictEqual(distance, 0);
    });

    it('should calculate distance from segments in itinerary', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const segment1 = new Segment('1', '2', 'Street', 150);

        node1.segment = segment1;

        tour.itinerary.push(node1);
        tour.itinerary.push(node2);

        const distance = tour.calculateTotalDistance();
        assert.strictEqual(distance, 150);
    });

    it('should sum all segment lengths in itinerary', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const node3 = new Node('3', 45.77, 4.87, []);

        const segment1 = new Segment('1', '2', 'Street A', 150);
        const segment2 = new Segment('2', '3', 'Street B', 200);

        node1.segment = segment1;
        node2.segment = segment2;

        tour.itinerary.push(node1);
        tour.itinerary.push(node2);
        tour.itinerary.push(node3);

        const distance = tour.calculateTotalDistance();
        assert.strictEqual(distance, 350);
    });
});

describe('Tour Class - toJSON Method', () => {

    it('should return correct JSON representation', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const json = tour.toJSON();

        assert.strictEqual(json.departureTime, '08:00');
        assert.strictEqual(json.courier, courier);
        assert.isTrue(Array.isArray(json.pickupDeliveryPointsList));
        assert.isTrue(Array.isArray(json.itinerary));
        assert.strictEqual(json.totalDuration, 0);
        assert.strictEqual(json.totalDistance, 0);
    });

    it('should include all tour properties in JSON', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const json = tour.toJSON();
        const keys = Object.keys(json);

        assert.isTrue(keys.includes('departureTime'));
        assert.isTrue(keys.includes('courier'));
        assert.isTrue(keys.includes('pickupDeliveryPointsList'));
        assert.isTrue(keys.includes('itinerary'));
        assert.isTrue(keys.includes('totalDuration'));
        assert.isTrue(keys.includes('totalDistance'));
    });
});

describe('Tour Class - toString Method', () => {

    it('should return correct string representation', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const str = tour.toString();

        assert.isTrue(str.includes('Tour'));
        assert.isTrue(str.includes('08:00'));
        assert.isTrue(str.includes('John Doe'));
    });

    it('should include departure time in string', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('14:30', courier);

        const str = tour.toString();
        assert.isTrue(str.includes('14:30'));
    });

    it('should include number of points', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node = new Node('1', 45.75, 4.85, []);
        const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);
        tour.addPoint(tourPoint, '08:10', '08:15');

        const str = tour.toString();
        assert.isTrue(str.includes('1'));
    });

    it('should handle null courier in string', () => {
        const tour = new Tour('08:00', null);
        const str = tour.toString();

        assert.isTrue(str.includes('Unassigned'));
    });
});

describe('Tour Class - toXML Method', () => {

    it('should generate XML with header', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<?xml version="1.0"'));
        assert.isTrue(xml.includes('<reseau>'));
        assert.isTrue(xml.includes('</reseau>'));
    });

    it('should include nodes in XML', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node = new Node('123', 45.75, 4.85, []);
        tour.itinerary.push(node);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<noeud'));
        assert.isTrue(xml.includes('id="123"'));
        assert.isTrue(xml.includes('latitude="45.75"'));
        assert.isTrue(xml.includes('longitude="4.85"'));
    });

    it('should include segments in XML', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const node1 = new Node('1', 45.75, 4.85, []);
        const node2 = new Node('2', 45.76, 4.86, []);
        const segment = new Segment('1', '2', 'Main Street', 150);

        node1.segment = segment;

        tour.itinerary.push(node1);
        tour.itinerary.push(node2);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<troncon'));
        assert.isTrue(xml.includes('origine="1"'));
        assert.isTrue(xml.includes('destination="2"'));
        assert.isTrue(xml.includes('nomRue="Main Street"'));
        assert.isTrue(xml.includes('longueur="150"'));
    });

    it('should generate valid XML structure for empty itinerary', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const xml = tour.toXML();

        assert.isTrue(xml.includes('<?xml'));
        assert.isTrue(xml.includes('<reseau>'));
        assert.isTrue(xml.includes('</reseau>'));
    });
});

describe('Tour Class - Edge Cases', () => {

    it('should handle tour with only warehouse point', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        const warehouse = new Node('W', 45.75, 4.85, []);
        const warehousePoint = new TourPoint(warehouse, TypePoint.ENTREPOT, 0, null);

        tour.addPoint(warehousePoint, '08:00', '08:00');

        assert.strictEqual(tour.pickupDeliveryPointsList.length, 1);
    });

    it('should handle very early departure time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('00:00', courier);

        assert.strictEqual(tour.departureTime, '00:00');
    });

    it('should handle very late departure time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('23:59', courier);

        assert.strictEqual(tour.departureTime, '23:59');
    });

    it('should handle tour with many points', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour('08:00', courier);

        for (let i = 0; i < 100; i++) {
            const node = new Node(String(i), 45.75, 4.85, []);
            const tourPoint = new TourPoint(node, TypePoint.PICKUP, 300, null);
            tour.addPoint(tourPoint, '08:00', '08:05');
        }

        assert.strictEqual(tour.pickupDeliveryPointsList.length, 100);
    });

    it('should handle null departure time', () => {
        const courier = new Courier('C001', 'John Doe');
        const tour = new Tour(null, courier);

        assert.strictEqual(tour.departureTime, null);
    });

    it('should handle undefined courier', () => {
        const tour = new Tour('08:00', undefined);

        assert.strictEqual(tour.courier, undefined);
    });
});

// Export results
module.exports = getResults();

