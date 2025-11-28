const { assert, describe, it } = require('./testFramework');
const Node = require('../backend/node');
const Segment = require('../backend/segment');
const Plan = require('../backend/plan');

describe('Dijkstra Algorithm Tests', () => {

    it('Basic path finding', () => {
        // Create a simple graph: A -> B -> C
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);
        const nodeC = new Node("C", 45.77, 4.87, []);

        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);
        const segBC = new Segment(nodeB, nodeC, "Rue BC", 150);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB],
            ["C", nodeC]
        ]);
        plan.segments = [segAB, segBC];

        const result = plan.findShortestPath("A", "C");

        assert.isTrue(result !== null, "Path should exist");
        assert.strictEqual(result.path.length, 3, "Path should have 3 nodes");
        assert.strictEqual(result.path[0], "A", "Path should start at A");
        assert.strictEqual(result.path[1], "B", "Path should go through B");
        assert.strictEqual(result.path[2], "C", "Path should end at C");
        assert.strictEqual(result.distance, 250, "Total distance should be 250");
        assert.strictEqual(result.segments.length, 2, "Path should have 2 segments");
    });

    it('Shortest path selection', () => {
        // Create a graph with multiple paths:
        //   A --100--> B --50--> D
        //   A --200-----------> D
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);
        const nodeD = new Node("D", 45.77, 4.87, []);

        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);
        const segBD = new Segment(nodeB, nodeD, "Rue BD", 50);
        const segAD = new Segment(nodeA, nodeD, "Rue AD", 200);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB],
            ["D", nodeD]
        ]);
        plan.segments = [segAB, segBD, segAD];

        const result = plan.findShortestPath("A", "D");

        assert.isTrue(result !== null, "Path should exist");
        assert.strictEqual(result.distance, 150, "Should take shorter path (100+50=150 vs 200)");
        assert.strictEqual(result.path.length, 3, "Shorter path goes through B");
        assert.strictEqual(result.path[1], "B", "Should go through B");
    });

    it('No path exists', () => {
        // Create disconnected graph: A -> B    C -> D
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);
        const nodeC = new Node("C", 45.77, 4.87, []);
        const nodeD = new Node("D", 45.78, 4.88, []);

        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);
        const segCD = new Segment(nodeC, nodeD, "Rue CD", 100);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB],
            ["C", nodeC],
            ["D", nodeD]
        ]);
        plan.segments = [segAB, segCD];

        const result = plan.findShortestPath("A", "D");

        assert.strictEqual(result, null, "Should return null when no path exists");
    });

    it('Same start and end node', () => {
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segAB];

        const result = plan.findShortestPath("A", "A");

        assert.isTrue(result !== null, "Path to self should exist");
        assert.strictEqual(result.path.length, 1, "Path should contain only start node");
        assert.strictEqual(result.distance, 0, "Distance should be 0");
        assert.strictEqual(result.segments.length, 0, "Should have no segments");
    });

    it('Invalid node IDs', () => {
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segAB];

        const result1 = plan.findShortestPath("A", "Z");
        const result2 = plan.findShortestPath("Z", "A");

        assert.strictEqual(result1, null, "Should return null for non-existent destination");
        assert.strictEqual(result2, null, "Should return null for non-existent start");
    });

    it('Bidirectional segments', () => {
        // Test that segments work in both directions
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);

        // Segment defined as A->B but should work both ways
        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB]
        ]);
        plan.segments = [segAB];

        const resultAtoB = plan.findShortestPath("A", "B");
        const resultBtoA = plan.findShortestPath("B", "A");

        assert.isTrue(resultAtoB !== null, "Path A->B should exist");
        assert.isTrue(resultBtoA !== null, "Path B->A should exist (bidirectional)");
        assert.strictEqual(resultAtoB.distance, 100, "Distance A->B should be 100");
        assert.strictEqual(resultBtoA.distance, 100, "Distance B->A should be 100");
    });

    it('Complex graph', () => {
        // Create a more complex graph:
        //     B--50--C
        //    /|      |
        //  100|      |30
        //    \|      |
        //     A--80--D
        const nodeA = new Node("A", 45.75, 4.85, []);
        const nodeB = new Node("B", 45.76, 4.86, []);
        const nodeC = new Node("C", 45.77, 4.87, []);
        const nodeD = new Node("D", 45.78, 4.88, []);

        const segAB = new Segment(nodeA, nodeB, "Rue AB", 100);
        const segBC = new Segment(nodeB, nodeC, "Rue BC", 50);
        const segCD = new Segment(nodeC, nodeD, "Rue CD", 30);
        const segAD = new Segment(nodeA, nodeD, "Rue AD", 80);

        const plan = new Plan();
        plan.nodes = new Map([
            ["A", nodeA],
            ["B", nodeB],
            ["C", nodeC],
            ["D", nodeD]
        ]);
        plan.segments = [segAB, segBC, segCD, segAD];

        const result = plan.findShortestPath("A", "D");

        assert.isTrue(result !== null, "Path should exist");
        assert.strictEqual(result.distance, 80, "Should take direct path A->D (80 vs A->B->C->D=180)");
        assert.strictEqual(result.path.length, 2, "Direct path has 2 nodes");
        assert.strictEqual(result.path[0], "A", "Path should start at A");
        assert.strictEqual(result.path[1], "D", "Path should end at D");
    });

});
