/**
 * Test Suite for ComputerTour.computeCompleteTour
 */

const ComputerTour = require('../backend/computerTour');
const Plan = require('../backend/plan');
const Node = require('../backend/node');
const Segment = require('../backend/segment');
const Leg = require('../backend/leg');
const { TourPoint, TypePoint } = require('../backend/tourpoint');
const Courier = require('../backend/courier');
const { describe, it, assert, getResults } = require('./testFramework');

function buildSimplePlan() {
    // Nodes
    const n1 = new Node('A', 0, 0, []);
    const n2 = new Node('B', 0, 1, []);
    const n3 = new Node('C', 1, 1, []);

    // Segments (bidirectional connectivity through undirected lookup)
    const s12 = new Segment(n1, n2, 'A-B', 1000);
    const s23 = new Segment(n2, n3, 'B-C', 1200);
    const s31 = new Segment(n3, n1, 'C-A', 1500);

    n1.segments.push(s12);
    n2.segments.push(s23);
    n3.segments.push(s31);

    const nodesMap = new Map([['A', n1], ['B', n2], ['C', n3]]);
    const plan = new Plan(nodesMap, [s12, s23, s31], n1);
    return { plan, nodes: { n1, n2, n3 }, segments: { s12, s23, s31 } };
}

describe('ComputerTour.computeCompleteTour', () => {
    it('builds a complete tour with legs and totals', () => {
        const { plan, nodes } = buildSimplePlan();
        const computerTour = new ComputerTour(plan);
        const courier = new Courier('C1', 'Alice');

        const warehouse = new TourPoint(nodes.n1, 0, TypePoint.ENTREPOT, null);
        const pickup = new TourPoint(nodes.n2, 300, TypePoint.PICKUP, { id: 'D1' });
        const delivery = new TourPoint(nodes.n3, 300, TypePoint.DELIVERY, { id: 'D1' });
        pickup.relatedTourPoint = delivery;
        delivery.relatedTourPoint = pickup;

        const tour = computerTour.computeCompleteTour([warehouse, pickup, delivery, warehouse], courier);

        assert.isTrue(!!tour, 'Tour should be returned');
        assert.strictEqual(tour.stops.length, 4, 'Tour should include all stops');
        assert.strictEqual(tour.legs.length, 3, 'Tour should include all legs');
        assert.strictEqual(tour.courier, courier, 'Tour should carry the provided courier');

        // Distances from the plan: 1000 + 1200 + 1500
        assert.strictEqual(tour.totalDistance, 3700);

        // Travel time is distance at 15 km/h => distance / (15km/h) seconds
        const speedMps = (15 * 1000) / 3600;
        const expectedTravel = Math.round(1000 / speedMps) + Math.round(1200 / speedMps) + Math.round(1500 / speedMps);
        const expectedDuration = expectedTravel + 0 + 300 + 300 + 0;
        assert.strictEqual(tour.totalDuration, expectedDuration);
    });

    it('returns null when no path exists between two stops', () => {
        const nodeA = new Node('A', 0, 0, []);
        const nodeB = new Node('B', 0, 1, []);
        const nodesMap = new Map([['A', nodeA], ['B', nodeB]]);
        const plan = new Plan(nodesMap, [], nodeA); // no segments, no paths
        const computerTour = new ComputerTour(plan);
        const courier = new Courier('C2', 'Bob');

        const depot = new TourPoint(nodeA, 0, TypePoint.ENTREPOT, null);
        const pickup = new TourPoint(nodeB, 100, TypePoint.PICKUP, null);

        const tour = computerTour.computeCompleteTour([depot, pickup], courier);
        assert.strictEqual(tour, null, 'Should return null if no path exists');
    });
});

module.exports = getResults();
