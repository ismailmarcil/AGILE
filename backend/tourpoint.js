/**
 * Enum representing the type of a tour point
 */
const TypePoint = {
    PICKUP: "PICKUP",
    DELIVERY: "DELIVERY",
    ENTREPOT: "ENTREPOT"
};

/**
 * Class representing a point in a delivery tour (pickup, delivery, or warehouse)
 */
class TourPoint {

    /**
     * Constructor for the TourPoint class
     * @param {Node} node - Node where the action takes place
     * @param {("PICKUP"|"DELIVERY"|"ENTREPOT")} type - The type of point
     * @param {number} serviceDuration - Duration of the service in seconds
     * @param {Demand|null} demand - Related demand (null for ENTREPOT)
     */
    constructor(node, type, serviceDuration = 0, demand = null) {
        this.node = node;                 // Node object (location)
        this.type = type;                 // TypePoint value
        this.serviceDuration = serviceDuration; // Duration in seconds
        this.demand = demand;             // Demand object or null
    }

    /**
     * Returns a JSON representation of the tour point
     * @returns {Object}
     */
    toJSON() {
        return {
            node: this.node ? this.node.toJSON() : null,
            type: this.type,
            serviceDuration: this.serviceDuration,
            demand: this.demand ? this.demand.toJSON() : null
        };
    }

    /**
     * Returns a textual summary of the tour point
     * @returns {string}
     */
    toString() {
        return `TourPoint - ${this.type} @ Node ${this.node ? this.node.id : "?"} (service: ${this.serviceDuration}s)`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TourPoint, TypePoint };
}
