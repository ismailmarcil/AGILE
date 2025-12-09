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
        this.pathfindingAlgorithm = 'astar'; // Default to A* for better performance
        this.tspStrategy = 'v1'; // Default to flexible strategy
    }

    /**
     * Sets the pathfinding algorithm to use
     * @param {string} algorithm - 'dijkstra' or 'astar'
     */
    setPathfindingAlgorithm(algorithm) {
        if (algorithm === 'dijkstra' || algorithm === 'astar') {
            this.pathfindingAlgorithm = algorithm;
        } else {
            console.warn(`Invalid algorithm: ${algorithm}. Using default: astar`);
            this.pathfindingAlgorithm = 'astar';
        }
    }

    /**
     * Sets the TSP strategy to use
     * @param {string} strategy - 'v0' (rigid), 'v1' (flexible), or 'v2' (nearest neighbor)
     */
    setTSPStrategy(strategy) {
        if (['v0', 'v1', 'v2'].includes(strategy)) {
            this.tspStrategy = strategy;
        } else {
            console.warn(`Invalid TSP strategy: ${strategy}. Using default: v1`);
            this.tspStrategy = 'v1';
        }
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

                    // Compute shortest path between fromPoint.node and toPoint.node using configured algorithm
                    const pathResult = this.findShortestPath(fromPoint.node.id, toPoint.node.id, this.pathfindingAlgorithm);
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
     * A* algorithm implementation for shortest path with euclidean heuristic
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @returns {Object} { pathIds: Array<string>, distance: number, segments: Array<Segment> } or null if no path exists
     * @private
     */
    aStarShortestPath(startId, endId) {
        // Validate nodes exist
        if (!this.plan.nodes.has(startId) || !this.plan.nodes.has(endId)) {
            return null;
        }

        const startNode = this.plan.nodes.get(startId);
        const endNode = this.plan.nodes.get(endId);

        // Euclidean distance heuristic
        const heuristic = (nodeId) => {
            const node = this.plan.nodes.get(nodeId);
            const dx = node.longitude - endNode.longitude;
            const dy = node.latitude - endNode.latitude;
            // Convert to approximate meters (rough approximation for Lyon area)
            const latToMeters = 111000; // 1 degree latitude ≈ 111 km
            const lonToMeters = latToMeters * Math.cos(node.latitude * Math.PI / 180);
            return Math.sqrt((dx * lonToMeters) ** 2 + (dy * latToMeters) ** 2);
        };

        // Initialize A* data structures
        const openSet = new Set([startId]);
        const closedSet = new Set();
        const gScore = new Map(); // Actual distance from start
        const fScore = new Map(); // gScore + heuristic
        const previous = new Map();

        // Initialize all nodes
        this.plan.nodes.forEach((node, id) => {
            gScore.set(id, id == startId ? 0 : Infinity);
            fScore.set(id, id == startId ? heuristic(startId) : Infinity);
            previous.set(id, null);
        });

        while (openSet.size > 0) {
            // Find node in openSet with lowest fScore
            let currentId = null;
            let minFScore = Infinity;
            openSet.forEach(id => {
                if (fScore.get(id) < minFScore) {
                    minFScore = fScore.get(id);
                    currentId = id;
                }
            });

            // If no valid node found
            if (currentId === null) {
                return null;
            }

            // If we reached the destination
            if (currentId == endId) {
                break;
            }

            // Move current from open to closed set
            openSet.delete(currentId);
            closedSet.add(currentId);

            // Check all neighbors
            const neighbors = this.plan.getNeighbors(currentId);
            neighbors.forEach(neighborId => {
                // Skip if already evaluated
                if (closedSet.has(neighborId)) return;

                // Find segment connecting current to neighbor
                const segment = this.plan.segments.find(s =>
                    (s.origin.id == currentId && s.destination.id == neighborId) ||
                    (s.destination.id == currentId && s.origin.id == neighborId)
                );

                if (!segment) return;

                // Calculate tentative gScore
                const tentativeGScore = gScore.get(currentId) + segment.length;

                // Add to open set if not already there
                if (!openSet.has(neighborId)) {
                    openSet.add(neighborId);
                } else if (tentativeGScore >= gScore.get(neighborId)) {
                    // Not a better path
                    return;
                }

                // This is the best path so far, record it
                previous.set(neighborId, currentId);
                gScore.set(neighborId, tentativeGScore);
                fScore.set(neighborId, tentativeGScore + heuristic(neighborId));
            });
        }

        // Reconstruct path with IDs
        const pathIds = [];
        let current = endId;
        while (current !== null) {
            pathIds.unshift(current);
            current = previous.get(current);
        }

        // If path doesn't start at startId, no path exists
        if (pathIds[0] != startId) {
            return null;
        }

        // Get segments along the path
        const pathSegments = [];
        for (let i = 0; i < pathIds.length - 1; i++) {
            const segment = this.plan.segments.find(s =>
                (s.origin.id == pathIds[i] && s.destination.id == pathIds[i + 1]) ||
                (s.destination.id == pathIds[i] && s.origin.id == pathIds[i + 1])
            );
            if (segment) {
                pathSegments.push(segment);
            }
        }

        return {
            pathIds: pathIds,
            distance: gScore.get(endId),
            segments: pathSegments
        };
    }

    /**
     * Dijkstra algorithm implementation for shortest path
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @returns {Object} { pathIds: Array<string>, distance: number, segments: Array<Segment> } or null if no path exists
     * @private
     */
    dijkstraShortestPath(startId, endId) {
        // Validate nodes exist
        if (!this.plan.nodes.has(startId) || !this.plan.nodes.has(endId)) {
            return null;
        }

        // Initialize distances and previous nodes
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Set all distances to infinity except start node
        this.plan.nodes.forEach((node, id) => {
            distances.set(id, id == startId ? 0 : Infinity);
            previous.set(id, null);
            unvisited.add(id);
        });

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let currentId = null;
            let minDistance = Infinity;
            unvisited.forEach(id => {
                if (distances.get(id) < minDistance) {
                    minDistance = distances.get(id);
                    currentId = id;
                }
            });

            // If no path exists
            if (currentId === null || minDistance === Infinity) {
                return null;
            }

            // Remove current from unvisited
            unvisited.delete(currentId);

            // If we reached the destination
            if (currentId == endId) {
                break;
            }

            // Check all neighbors
            const neighbors = this.plan.getNeighbors(currentId);
            neighbors.forEach(neighborId => {
                if (!unvisited.has(neighborId)) return;

                // Find segment connecting current to neighbor
                const segment = this.plan.segments.find(s =>
                    (s.origin.id == currentId && s.destination.id == neighborId) ||
                    (s.destination.id == currentId && s.origin.id == neighborId)
                );

                if (!segment) return;

                // Calculate new distance
                const newDistance = distances.get(currentId) + segment.length;

                // Update if shorter path found
                if (newDistance < distances.get(neighborId)) {
                    distances.set(neighborId, newDistance);
                    previous.set(neighborId, currentId);
                }
            });
        }

        // Reconstruct path with IDs
        const pathIds = [];
        let current = endId;
        while (current !== null) {
            pathIds.unshift(current);
            current = previous.get(current);
        }

        // If path doesn't start at startId, no path exists
        if (pathIds[0] != startId) {
            return null;
        }

        // Get segments along the path
        const pathSegments = [];
        for (let i = 0; i < pathIds.length - 1; i++) {
            const segment = this.plan.segments.find(s =>
                (s.origin.id == pathIds[i] && s.destination.id == pathIds[i + 1]) ||
                (s.destination.id == pathIds[i] && s.origin.id == pathIds[i + 1])
            );
            if (segment) {
                pathSegments.push(segment);
            }
        }

        return {
            pathIds: pathIds,
            distance: distances.get(endId),
            segments: pathSegments
        };
    }

    /**
     * Enhanced shortest path finder that can use Dijkstra or A* algorithm
     * @param {string|number} startId - Starting node ID
     * @param {string|number} endId - Destination node ID
     * @param {string} algorithm - Algorithm to use: 'dijkstra' or 'astar' (default: 'astar')
     * @returns {Object} { path: Array<Node>, distance: number, segments: Array<Segment> } or null if no path exists
     * @private
     */
    findShortestPath(startId, endId, algorithm = 'astar') {
        let algorithmResult;
        
        if (algorithm === 'astar') {
            algorithmResult = this.aStarShortestPath(startId, endId);
        } else if (algorithm === 'dijkstra') {
            algorithmResult = this.dijkstraShortestPath(startId, endId);
        } else {
            console.warn(`Unknown algorithm: ${algorithm}, falling back to A*`);
            algorithmResult = this.aStarShortestPath(startId, endId);
        }
        
        if (!algorithmResult) {
            return null;
        }

        // Convert IDs to Node objects
        const path = algorithmResult.pathIds.map(id => this.plan.nodes.get(id));

        return {
            path: path,
            distance: algorithmResult.distance,
            segments: algorithmResult.segments
        };
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
        switch (this.tspStrategy) {
            case 'v0':
                return this.computeTSPTourV0();
            case 'v1':
                return this.computeTSPTourV1();
            case 'v2':
                return this.computeTSPTourV2();
            default:
                console.warn(`Unknown TSP strategy: ${this.tspStrategy}, using v1`);
                return this.computeTSPTourV1();
        }
    }

    /**
     * Version 0 : Give a random order (respecting the precedence constraints)
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV0() {
        const finalPath = new Array();
        finalPath.push(this.start);
        for (const [delivery, pickup] of this.precedence.entries()) {
            finalPath.push(pickup);
            finalPath.push(delivery);
        }
        finalPath.push(this.start);
        return finalPath;
    }

    computeTSPTourV1() {
        let bestTour = null;
        let bestDistance = Infinity;

        // Convert tourPoints Set to Array with indices
        const tourPointsArray = [this.start, ...Array.from(this.tourPoints)];

        const enumerate = (currentPath, visited, currentDuration) => {
            const lastPoint = currentPath[currentPath.length - 1];

            // If all points visited, check if we can return to warehouse
            if (visited.size === tourPointsArray.length) {
                const returnKey = this.getKey(lastPoint, this.start);
                const returnTime = this.tourPointGraphTimes.get(returnKey);
                const totalDuration = currentDuration + returnTime;

                if (totalDuration < bestDistance) {
                    bestDistance = totalDuration;
                    bestTour = [...currentPath, this.start];
                }
                return;
            }

            // Try each unvisited point
            for (let i = 1; i < tourPointsArray.length; i++) {
                const nextPoint = tourPointsArray[i];

                // Skip if already visited
                if (visited.has(nextPoint)) continue;

                // Check precedence: can't deliver before pickup
                if (this.precedence.has(nextPoint)) {
                    const requiredPickup = this.precedence.get(nextPoint);
                    if (!visited.has(requiredPickup)) continue;
                }

                const key = this.getKey(lastPoint, nextPoint);
                const travelTime = this.tourPointGraphTimes.get(key);
                const newDuration = currentDuration + travelTime;

                // Prune if already worse than best
                if (newDuration >= bestDistance) continue;

                // Branch: explore this path
                visited.add(nextPoint);
                currentPath.push(nextPoint);

                enumerate(currentPath, visited, newDuration);

                // Backtrack
                currentPath.pop();
                visited.delete(nextPoint);
            }
        };

        // Start enumeration from warehouse
        const initialVisited = new Set([this.start]);
        enumerate([this.start], initialVisited, 0);

        return bestTour;
    }

    /**
     * Version 1 : Compute all permutations (inefficient for large sets)
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV2_Jade(){
        const allPoints = Array.from(this.tourPoints);
        
        let bestTour = null;
        let bestCost = Infinity;
        
        /**
         * Recursive function to generate permutations with early pruning
         * @param {Array<TourPoint>} currentPath - Current path being built (starts with warehouse)
         * @param {Set<TourPoint>} remaining - Remaining tour points to visit
         * @param {Set<TourPoint>} pickedUp - Set of pickups that have been visited
         * @param {number} currentCost - Current accumulated travel time
         */
        const buildTour = (currentPath, remaining, pickedUp, currentCost) => {
            // Pruning: if current cost already exceeds best, stop exploring this branch
            if (currentCost >= bestCost) {
                return;
            }
            
            // Base case: all points visited, return to warehouse
            if (remaining.size === 0) {
                const lastPoint = currentPath[currentPath.length - 1];
                const returnKey = this.getKey(lastPoint, this.start);
                const returnTime = this.tourPointGraphTimes.get(returnKey);
                
                if (returnTime === undefined) {
                    return; // No path back to warehouse
                }
                
                const totalCost = currentCost + returnTime;
                if (totalCost < bestCost) {
                    bestCost = totalCost;
                    bestTour = [...currentPath, this.start];
                }
                return;
            }
            
            // Try each remaining point
            for (const nextPoint of remaining) {
                // Check precedence constraint: if it's a delivery, its pickup must be done
                if (this.precedence.has(nextPoint)) {
                    const requiredPickup = this.precedence.get(nextPoint);
                    if (!pickedUp.has(requiredPickup)) {
                        continue; // Skip this delivery, pickup not done yet
                    }
                }
                
                // Get travel time from current position to next point
                const currentPoint = currentPath[currentPath.length - 1];
                const edgeKey = this.getKey(currentPoint, nextPoint);
                const travelTime = this.tourPointGraphTimes.get(edgeKey);
                
                if (travelTime === undefined) {
                    continue; // No path to this point
                }
                
                // Calculate new cost (travel time only)
                const newCost = currentCost + travelTime;
                
                // Prepare next state
                const newPath = [...currentPath, nextPoint];
                const newRemaining = new Set(remaining);
                newRemaining.delete(nextPoint);
                const newPickedUp = new Set(pickedUp);
                
                // If this is a pickup (using type property), mark it as picked up
                if (nextPoint.type === "PICKUP") {
                    newPickedUp.add(nextPoint);
                }
                
                // Recurse
                buildTour(newPath, newRemaining, newPickedUp, newCost);
            }
        };
        
        // Start the search from the warehouse
        buildTour([this.start], new Set(allPoints), new Set(), 0);
        
        return bestTour;
    }

    /**
     * Version 1 : Flexible order with precedence validation
     * Allows visiting all pickups first, then deliveries (respecting precedences)
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV1() {
        const finalPath = [];
        finalPath.push(this.start);

        // Get all pickups and deliveries
        const allPickups = [];
        const allDeliveries = [];
        
        for (const [delivery, pickup] of this.precedence.entries()) {
            allPickups.push(pickup);
            allDeliveries.push(delivery);
        }

        // Strategy: Visit all pickups first, then deliveries in valid order
        const visited = new Set();
        const visitedPickups = new Set();

        // Phase 1: Visit all pickups
        for (const pickup of allPickups) {
            finalPath.push(pickup);
            visited.add(pickup);
            visitedPickups.add(pickup);
        }

        // Phase 2: Visit deliveries, ensuring their pickup was already visited
        const remainingDeliveries = [...allDeliveries];
        
        while (remainingDeliveries.length > 0) {
            let foundValid = false;
            
            for (let i = 0; i < remainingDeliveries.length; i++) {
                const delivery = remainingDeliveries[i];
                const requiredPickup = this.precedence.get(delivery);
                
                // Can visit this delivery if its pickup was already visited
                if (visitedPickups.has(requiredPickup)) {
                    finalPath.push(delivery);
                    visited.add(delivery);
                    remainingDeliveries.splice(i, 1);
                    foundValid = true;
                    break;
                }
            }
            
            // If no valid delivery found, there's a precedence issue
            if (!foundValid) {
                console.error("ComputerTour.computeTSPTourV1: Precedence constraint violation");
                return null;
            }
        }

        finalPath.push(this.start);
        return finalPath;
    }

    /**
     * Version 2 : Nearest neighbor with precedence constraints
     * @returns {Array<TourPoint>|null}
     * @private
     */
    computeTSPTourV2() {
        const finalPath = [];
        finalPath.push(this.start);

        const visited = new Set();
        const visitedPickups = new Set();
        let currentPoint = this.start;

        // Get all points that need to be visited
        const allPoints = Array.from(this.tourPoints);

        while (visited.size < allPoints.length) {
            let nearestPoint = null;
            let nearestDistance = Infinity;

            // Find the nearest valid point (respecting precedences)
            for (const point of allPoints) {
                if (visited.has(point)) continue;

                // Check precedence constraint
                if (this.precedence.has(point)) {
                    // This is a delivery point, check if pickup was visited
                    const requiredPickup = this.precedence.get(point);
                    if (!visitedPickups.has(requiredPickup)) {
                        continue; // Cannot visit delivery before its pickup
                    }
                }

                // Calculate distance to this point
                const key = this.getKey(currentPoint, point);
                const distance = this.tourPointGraphTimes.get(key) || Infinity;

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPoint = point;
                }
            }

            if (!nearestPoint) {
                console.error("ComputerTour.computeTSPTourV2: No valid next point found");
                return null;
            }

            // Visit the nearest valid point
            finalPath.push(nearestPoint);
            visited.add(nearestPoint);

            // If this is a pickup, mark it as visited
            if (!this.precedence.has(nearestPoint)) {
                // This is likely a pickup (not in precedence as key)
                visitedPickups.add(nearestPoint);
            }

            currentPoint = nearestPoint;
        }

        finalPath.push(this.start);
        return finalPath;
    }

    /**
     * Validates that a tour respects all precedence constraints
     * @param {Array<TourPoint>} tour - The tour to validate
     * @returns {boolean} - True if valid, false otherwise
     * @private
     */
    validatePrecedenceConstraints(tour) {
        const visitOrder = new Map();
        
        // Record visit order
        for (let i = 0; i < tour.length; i++) {
            visitOrder.set(tour[i], i);
        }

        // Check all precedence constraints
        for (const [delivery, pickup] of this.precedence.entries()) {
            const pickupOrder = visitOrder.get(pickup);
            const deliveryOrder = visitOrder.get(delivery);

            if (pickupOrder === undefined || deliveryOrder === undefined) {
                console.error("ComputerTour.validatePrecedenceConstraints: Missing point in tour");
                return false;
            }

            if (pickupOrder >= deliveryOrder) {
                console.error(`ComputerTour.validatePrecedenceConstraints: Pickup ${pickup.node.id} must come before delivery ${delivery.node.id}`);
                return false;
            }
        }

        return true;
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
        const LegClass = Leg || require('./leg');

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
                // Compute shortest path using configured algorithm (A* or Dijkstra)
                const pathResult = this.findShortestPath(from?.node?.id, to?.node?.id, this.pathfindingAlgorithm);
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