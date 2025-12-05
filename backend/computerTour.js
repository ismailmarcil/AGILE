/**
 * Class responsible for computing optimal delivery tours
 */
class ComputerTour {
    /**
     * Constructor for the ComputerTour class
     * @param {Plan} plan - The city plan containing nodes and segments
     */
    constructor(plan) {
        this.plan = plan;
        this.start = null; // TourPoint
        this.tourPoints = new Set(); // Set<TourPoint>
        this.precedence = new Map(); // Map<TourPointDelivery, TourPointPickup>
        this.tourPointGraphTimes = new Map(); // Map<[TourPoint, TourPoint], string>
        this.tourPointGraphLegs = new Map(); // Map<[TourPoint, TourPoint], Leg>
    }

    /**
     * Computes a complete tour from an array of pickup/delivery pairs
     * @param {Array<[TourPoint, TourPoint]>} pickupDeliveryPairs - Array of [TourPointPickup, TourPointDelivery] pairs
     * @returns {Tour|null}
     */
    computeTour(pickupDeliveryPairs) {
        // 1. Fill internal data structures
        this.fillTourPointStructures(pickupDeliveryPairs);
        // 2. Compute the TSP tour
        const tspTour = this.computeTSPTour();
        if (!tspTour) {
            return null;
        }
        // 3. Compute the complete tour with all details
        return this.computeCompleteTour(tspTour);
    }

    /**
     * Fills the internal tour point data structures
     * @param {Array<[TourPoint, TourPoint]>} pickupDeliveryPairs - Array of [TourPointPickup, TourPointDelivery] pairs
     * @private
     */
    fillTourPointStructures(pickupDeliveryPairs) {
        // Implementation here
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
        for (const [pickup, delivery] of this.precedence.entries()) {
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

        // Helper to create a map key for [from,to]
        const keyFor = (from, to) => `${from?.node?.id || 'null'}->${to?.node?.id || 'null'}`;

        // Helper: try to find a precomputed leg (string key or array key)
        const getPrecomputedLeg = (from, to) => {
            if (!this.tourPointGraphLegs) return null;
            const stringKey = keyFor(from, to);
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
            const stringKey = keyFor(from, to);
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
                    this.tourPointGraphLegs.set(keyFor(from, to), leg);
                }
                if (this.tourPointGraphTimes && typeof travelTimeSeconds === 'number') {
                    this.tourPointGraphTimes.set(keyFor(from, to), travelTimeSeconds);
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
