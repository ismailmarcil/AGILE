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
     * @param {Array<TourPoint>} tourPointsArray - Ordered array of tour points (expected depot first/last)
     * @param {Courier|null} courier - Courier assigned to the tour
     * @returns {Tour|null}
     * @private
     */
    computeCompleteTour(tourPointsArray, courier = null) {
        if (!Array.isArray(tourPointsArray) || tourPointsArray.length < 2) {
            console.error("ComputerTour.computeCompleteTour: invalid tour points array");
            return null;
        }
        if (!this.plan) {
            console.error("ComputerTour.computeCompleteTour: plan is not set");
            return null;
        }

        const TourClass = (typeof Tour !== 'undefined') ? Tour : require('./tours');
        const LegClass = (typeof Leg !== 'undefined') ? Leg : require('./leg');

        const DEFAULT_DEPARTURE = "08:00";
        const tour = new TourClass(null, DEFAULT_DEPARTURE, courier || null);

        // Add stops in order
        tourPointsArray.forEach(tp => tour.addStop(tp));

        // Helper: try to find a precomputed leg (string key or array key)
        const getPrecomputedLeg = (from, to) => {
            if (!this.tourPointGraphLegs) return null;
            const stringKey = this.getKey(from, to);
            if (this.tourPointGraphLegs.has(stringKey)) {
                return this.tourPointGraphLegs.get(stringKey);
            }
            for (const [k, v] of this.tourPointGraphLegs.entries()) {
                if (Array.isArray(k) && k.length === 2 && k[0] === from && k[1] === to) {
                    return v;
                }
            }
            return null;
        };

        // Helper: try to get a precomputed travel time
        const getPrecomputedTimeSeconds = (from, to) => {
            if (!this.tourPointGraphTimes) return null;
            const stringKey = this.getKey(from, to);
            if (this.tourPointGraphTimes.has(stringKey)) {
                return this.tourPointGraphTimes.get(stringKey);
            }
            for (const [k, v] of this.tourPointGraphTimes.entries()) {
                if (Array.isArray(k) && k.length === 2 && k[0] === from && k[1] === to) {
                    return v;
                }
            }
            return null;
        };

        const estimateTravelTimeSeconds = (distanceMeters) => {
            // Assume 15 km/h average speed
            const speedMetersPerSecond = (15 * 1000) / 3600;
            return Math.round(distanceMeters / speedMetersPerSecond);
        };

        for (let i = 0; i < tourPointsArray.length - 1; i++) {
            const from = tourPointsArray[i];
            const to = tourPointsArray[i + 1];

            let leg = getPrecomputedLeg(from, to);

            if (!leg) {
                // Compute shortest path using the plan as a fallback
                const pathResult = this.plan.findShortestPath(from?.node?.id, to?.node?.id);
                if (!pathResult) {
                    console.error(`ComputerTour.computeCompleteTour: no path between ${from?.node?.id} and ${to?.node?.id}`);
                    return null;
                }
                const precomputedTime = getPrecomputedTimeSeconds(from, to);
                const travelTimeSeconds = typeof precomputedTime === 'number'
                    ? precomputedTime
                    : estimateTravelTimeSeconds(pathResult.distance || 0);

                leg = new LegClass(
                    from,
                    to,
                    pathResult.path || [],
                    pathResult.segments || [],
                    pathResult.distance || 0,
                    travelTimeSeconds
                );

                // Cache for future use
                if (this.tourPointGraphLegs) {
                    this.tourPointGraphLegs.set(this.getKey(from, to), leg);
                }
                if (this.tourPointGraphTimes && typeof travelTimeSeconds === 'number') {
                    this.tourPointGraphTimes.set(this.getKey(from, to), travelTimeSeconds);
                }
            }

            tour.addLeg(leg);
        }

        // Update totals
        tour.calculateTotalDistance();
        tour.calculateTotalDuration();

        return tour;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComputerTour;
}

// Export for Browser
if (typeof window !== 'undefined') {
    window.ComputerTour = ComputerTour;
}