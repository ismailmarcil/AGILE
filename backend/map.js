/**
 * Class representing a city plan (Plan)
 */
class Plan {

    /**
     * Constructor for the Plan class
     * @param {Array<Node>} nodes - List of all nodes (intersections)
     * @param {Array<Troncon>} segments - List of all segments (road segments)
     * @param {Node|null} warehouse - The warehouse node (starting point)
     */
    constructor(nodes = new Map() , segments = [], warehouse = null) {
        /**
         * @type {Array<Node>}
         */
        this.nodes = nodes;

        /**
         * @type {Array<Troncon>}
         */
        this.segments = segments;

        /**
         * @type {Node|null}
         */
        this.warehouse = warehouse;
    }

    /**
     * Loads a Plan from an XML file (placeholder for now)
     * @param {string} filePath - Path to the XML file
     * @returns {Promise<Plan>} The loaded Plan
     */
    static async loadFromXML(filePath) {
        // TODO: Implement XML parsing (using xml2js or similar)
        return new Plan();
    }

    /**
     * Finds and returns a node by its ID
     * @param {string|number} id - Node identifier
     * @returns {Node|null}
     */
    getNodeById(id) {
        return this.nodes.get(id) || null;
    }

    /**
     * Returns all outgoing road segments from a given node
     * @param {string|number} nodeId
     * @returns {Array<Troncon>}
     */
    getEdgesFrom(nodeId) {
        return this.segments.filter(e => e.origin == nodeId);
    }

    /**
     * Returns a JSON representation of the plan
     * @returns {Object}
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            segments: this.segments,
            warehouse: this.warehouse
        };
    }

    /**
     * Returns a textual summary of the plan
     * @returns {string}
     */
    toString() {
        return `Plan - ${this.nodes.size} nodes, ${this.segments.length} segments, warehouse: ${
            this.warehouse ? this.warehouse.id : 'None'
        }`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Plan;
}
