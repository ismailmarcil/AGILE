// Import Node class for inheritance

// Support Node.js (backend) AND browser (front)
let NodeBase;

// Node.js
if (typeof module !== 'undefined' && module.exports) {
    // adjust depending on the exact export in node.js
    NodeBase = require('./node.js'); 
}
// Browser
else {
    NodeBase = Node; // Node already defined in the browser context
}


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
 * Inherits from Node to represent a specialized node in a tour
 */
class TourPoint extends NodeBase {

    /**
     * Constructor for the TourPoint class
     * @param {string|number} id - Unique identifier of the node
     * @param {number} latitude - Latitude value
     * @param {number} longitude - Longitude value
     * @param {Array} segments - List of connected segments
     * @param {("PICKUP"|"DELIVERY"|"ENTREPOT")} type - The type of point
     * @param {number} serviceDuration - Duration of the service in seconds
     * @param {Demand|null} demand - Related demand (null for ENTREPOT)
     */
    constructor(id, latitude, longitude, segments, type, serviceDuration = 0, demand = null) {
        super(id, latitude, longitude, segments); // Call parent Node constructor
        this.type = type;                 // TypePoint value
        this.serviceDuration = serviceDuration; // Duration in seconds
        this.demand = demand;             // Demand object or null
        this.relatedId = null;            // ID of related point (for PICKUP/DELIVERY pairs)
    }

    /**
     * Returns a JSON representation of the tour point
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            latitude: this.latitude,
            longitude: this.longitude,
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
        return `TourPoint - ${this.type} @ Node ${this.id} (${this.latitude}, ${this.longitude}) (service: ${this.serviceDuration}s)`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TourPoint, TypePoint };
}
