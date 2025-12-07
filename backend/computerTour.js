const Leg = require('./leg.js');
const Tour = require('./tours.js');

/**
 * Class responsible for computing optimal delivery tours
 */
class ComputerTour {
    /**
     * Constructor for the ComputerTour class
     * @param {Plan} plan - The city plan containing nodes and segments
     * @param {TourPoint} warehouseStart - The warehouse starting point
     */
    constructor(plan, warehouseStart) {
        this.plan = plan;
        this.start = warehouseStart; // TourPoint
        this.tourPoints = new Set(); // Set<TourPoint>
        this.precedence = new Map(); // Map<TourPointDelivery, TourPointPickup>
        this.tourPointGraphTimes = new Map(); // Map<string, number> - key: "fromNodeId_toNodeId"
        this.tourPointGraphLegs = new Map(); // Map<string, Leg> - key: "fromNodeId_toNodeId"
    }

    /**
     * Computes a complete tour from an array of pickup/delivery pairs
     * @param {Array<[TourPoint, TourPoint]>} pickupDeliveryPairs - Array of [TourPointPickup, TourPointDelivery] pairs
     * @param {Courier} courier - The courier assigned to this tour
     * @returns {Tour|null}
     */
    computeTour(pickupDeliveryPairs, courier) {
        // 1. Fill internal data structures
        const success = this.fillTourPointStructures(pickupDeliveryPairs);
        if (!success) {
            return null;
        }
        // 2. Compute the TSP tour
        const tspTour = this.computeTSPTour();
        if (!tspTour) {
            return null;
        }
        // 3. Compute the complete tour with all details
        return this.computeCompleteTour(tspTour, courier);
    }

    /**
     * Fills the internal tour point data structures
     * @param {Array<[TourPoint, TourPoint]>} pickupDeliveryPairs - Array of [TourPointPickup, TourPointDelivery] pairs
     * @returns {boolean} - True if successful, false if no path exists
     * @private
     */
    fillTourPointStructures(pickupDeliveryPairs) {
        // Clear existing data (security), except the warehouse start point and plan.
        this.tourPoints.clear();
        this.precedence.clear();
        this.tourPointGraphTimes.clear();
        this.tourPointGraphLegs.clear();

        //      Fill with new data
        // 1. tourPoints & precedence
        for (const [pickup, delivery] of pickupDeliveryPairs) {
            this.tourPoints.add(pickup);
            this.tourPoints.add(delivery);
            this.precedence.set(delivery, pickup);
        }

        // 2. tourPointGraphTimes & tourPointGraphLegs
        const allTourPoints = Array.from(this.tourPoints);
        allTourPoints.push(this.start); // Include the warehouse start point
        // Get all pairs of tour points (including the warehouse)
        for (let i = 0; i < allTourPoints.length; i++) {
            for (let j = 0; j < allTourPoints.length; j++) {
                if (i !== j) {
                    const fromPoint = allTourPoints[i];
                    const toPoint = allTourPoints[j];

                    // Compute shortest path between fromPoint.node and toPoint.node
                    const pathResult = this.plan.findShortestPath(fromPoint.node.id, toPoint.node.id);
                    if (!pathResult) {
                        return false; // No path exists between these points
                    }
                    const travelTime = Math.ceil(pathResult.distance / (15000 / 3600)); // 15 km/h = 15000m/3600s
                    const leg = new Leg(fromPoint, toPoint, pathResult.path, pathResult.segments, pathResult.distance, travelTime);
                    // Store in the maps with string key
                    const key = this.getKey(fromPoint, toPoint);
                    this.tourPointGraphTimes.set(key, travelTime);
                    this.tourPointGraphLegs.set(key, leg);
                }
            }
        }
        return true;
    }

    /**
     * Generates a unique key for a pair of tour points
     * @param {TourPoint} fromPoint - The starting tour point
     * @param {TourPoint} toPoint - The ending tour point
     * @returns {string} - The key in format "fromNodeId_toNodeId"
     * @private
     */
    getKey(fromPoint, toPoint) {
        return `${fromPoint.node.id}_${toPoint.node.id}`;
    }

    /**
     * Computes the TSP (Traveling Salesman Problem) tour
     * @returns {Array<TourPoint>|null}
     * @private
     */
    // Version 0 : Give a random order (respecting the precedence constraints)
    // Version 1 : Compute all permutations (inefficient for large sets)
    // Version 2 : Constraints & Branch and Bound
    // Version 3 : Heuristic approaches for selecting the order of visits,
    // by selecting the nearest unvisited point at each step.
    computeTSPTour() {
        return this.computeTSPTourV0();
    }

    /**
     * Version 0 : Give a random order (respecting the precedence constraints)
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV0(){
        const finalPath = new Array();
        finalPath.push(this.start);
        for (const [delivery, pickup] of this.precedence.entries()) {
            finalPath.push(pickup);
            finalPath.push(delivery);
        }
        finalPath.push(this.start);
        return finalPath;
    }

    /**
     * Computes the complete tour with all details
     * @param {Array<TourPoint>} tourPointsArray - Ordered array of tour points
     * @param {Courier} courier - The courier assigned to this tour
     * @returns {Tour|null}
     * @private
     */
    computeCompleteTour(tourPointsArray, courier) {
        return null;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComputerTour;
}
