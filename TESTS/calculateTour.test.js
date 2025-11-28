const { assert, describe, it } = require('./testFramework');
const Node = require('../backend/node');
const Segment = require('../backend/segment');
const Plan = require('../backend/plan');
const System = require('../backend/system');
const Demand = require('../backend/demand');

describe('System.calculateTour() Tests', () => {

    it('Should create tour with one demand', () => {
        // Setup: Create a simple plan
        const nodeW = new Node("W", 45.75, 4.85, []);  // Warehouse
        const nodeA = new Node("A", 45.76, 4.86, []);  // Pickup
        const nodeB = new Node("B", 45.77, 4.87, []);  // Delivery

        const segWA = new Segment(nodeW, nodeA, "Rue WA", 100);
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 150);
        const segBW = new Segment(nodeB, nodeW, "Rue BW", 200);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segWA, segAB, segBW];
        plan.warehouse = nodeW;

        // Setup: Create system with one demand
        const system = new System(1);
        system.plan = plan;
        system.addDemand("A", "B", 60, 120);  // Pickup at A, deliver at B

        // Execute
        const tour = system.calculateTour();

        // Verify
        assert.isTrue(tour !== null, "Tour should be created");
        assert.isTrue(tour.legs.length > 0, "Tour should have legs");
        assert.isTrue(tour.stops.length > 0, "Tour should have stops");
        assert.strictEqual(tour.stops[0].type, "ENTREPOT", "First stop should be warehouse");
        assert.strictEqual(tour.stops[tour.stops.length - 1].type, "ENTREPOT", "Last stop should be warehouse");
    });

    it('Should create tour with multiple demands', () => {
        // Setup: Create a plan with more nodes
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);
        const nodeC = new Node("C", 45.78, 4.88, []);
        const nodeD = new Node("D", 45.79, 4.89, []);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB],
            ["C", nodeC],
            ["D", nodeD]
        ]);

        // Create segments for all connections
        plan.segments = [
            new Segment(nodeW, nodeA, "WA", 100),
            new Segment(nodeA, nodeB, "AB", 150),
            new Segment(nodeB, nodeC, "BC", 120),
            new Segment(nodeC, nodeD, "CD", 130),
            new Segment(nodeD, nodeW, "DW", 200),
            new Segment(nodeB, nodeW, "BW", 180),
            new Segment(nodeA, nodeC, "AC", 250)
        ];
        plan.warehouse = nodeW;

        // Setup: Create system with two demands
        const system = new System(1);
        system.plan = plan;
        system.addDemand("A", "B", 60, 120);   // Demand 1
        system.addDemand("C", "D", 45, 90);    // Demand 2

        // Execute
        const tour = system.calculateTour();

        // Verify
        assert.isTrue(tour !== null, "Tour should be created");
        assert.isTrue(tour.legs.length >= 5, "Tour should have at least 5 legs (W→A, A→B, B→C, C→D, D→W)");

        // Count stop types
        const pickupStops = tour.stops.filter(s => s.type === "PICKUP");
        const deliveryStops = tour.stops.filter(s => s.type === "DELIVERY");
        const warehouseStops = tour.stops.filter(s => s.type === "ENTREPOT");

        assert.strictEqual(pickupStops.length, 2, "Should have 2 pickup stops");
        assert.strictEqual(deliveryStops.length, 2, "Should have 2 delivery stops");
        assert.strictEqual(warehouseStops.length, 2, "Should have 2 warehouse stops (start and end)");
    });

    it('Should handle tour with warehouse not set', () => {
        const system = new System(1);
        system.plan = new Plan();
        system.plan.nodes = new Map();
        system.plan.segments = [];
        // Warehouse NOT set
        system.addDemand("A", "B", 60, 120);

        // Should return null or handle gracefully
        const tour = system.calculateTour();

        // The function should handle missing warehouse (either return null or throw)
        assert.isTrue(tour === null || tour === undefined, "Should handle missing warehouse");
    });

    it('Should create valid legs with path and segments', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);

        const segWA = new Segment(nodeW, nodeA, "Rue WA", 100);
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 150);
        const segBW = new Segment(nodeB, nodeW, "Rue BW", 200);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segWA, segAB, segBW];
        plan.warehouse = nodeW;

        const system = new System(1);
        system.plan = plan;
        system.addDemand("A", "B", 60, 120);

        const tour = system.calculateTour();

        // Verify each leg has required properties
        tour.legs.forEach((leg, index) => {
            assert.isTrue(leg.pathNode !== undefined, `Leg ${index} should have pathNode`);
            assert.isTrue(leg.pathNode.length > 0, `Leg ${index} pathNode should not be empty`);
            assert.isTrue(leg.distance !== undefined, `Leg ${index} should have distance`);
            assert.isTrue(leg.distance >= 0, `Leg ${index} distance should be non-negative`);
        });
    });

    it('Should add tour to toursList', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);

        const segWA = new Segment(nodeW, nodeA, "Rue WA", 100);
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 150);
        const segBW = new Segment(nodeB, nodeW, "Rue BW", 200);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segWA, segAB, segBW];
        plan.warehouse = nodeW;

        const system = new System(1);
        system.plan = plan;
        system.addDemand("A", "B", 60, 120);

        const initialToursCount = system.toursList.length;
        const tour = system.calculateTour();

        assert.strictEqual(system.toursList.length, initialToursCount + 1, "Tour should be added to toursList");
        assert.strictEqual(system.toursList[system.toursList.length - 1], tour, "Last tour in list should be the created tour");
    });

    it('Should respect pickup-delivery order for each demand', () => {
        const nodeW = new Node("W", 45.75, 4.85, []);
        const nodeA = new Node("A", 45.76, 4.86, []);
        const nodeB = new Node("B", 45.77, 4.87, []);

        const segWA = new Segment(nodeW, nodeA, "Rue WA", 100);
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 150);
        const segBW = new Segment(nodeB, nodeW, "Rue BW", 200);

        const plan = new Plan();
        plan.nodes = new Map([
            ["W", nodeW],
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segWA, segAB, segBW];
        plan.warehouse = nodeW;

        const system = new System(1);
        system.plan = plan;
        const demand = system.addDemand("A", "B", 60, 120);

        const tour = system.calculateTour();

        // Find pickup and delivery stops for this demand
        let pickupIndex = -1;
        let deliveryIndex = -1;

        tour.stops.forEach((stop, index) => {
            if (stop.type === "PICKUP" && stop.demand === demand) {
                pickupIndex = index;
            }
            if (stop.type === "DELIVERY" && stop.demand === demand) {
                deliveryIndex = index;
            }
        });

        assert.isTrue(pickupIndex >= 0, "Pickup stop should exist");
        assert.isTrue(deliveryIndex >= 0, "Delivery stop should exist");
        assert.isTrue(pickupIndex < deliveryIndex, "Pickup should come before delivery");
    });

});
