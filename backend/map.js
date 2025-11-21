/**
 * Class representing a city map (Map)
 */
class Map {

    /**
     * Constructor for the Map class
     * @param {Array<Node>} nodes - List of all nodes (intersections)
     * @param {Array<Troncon>} segments - List of all segments (road segments)
     * @param {Node|null} warehouse - The warehouse node (starting point)
     */
    constructor(nodes = [], segments = [], warehouse = null) {
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
     * Loads a Map from an XML file (placeholder for now)
     * @param {string} filePath - Path to the XML file
     * @returns {Promise<Map>} The loaded Map
     */
    static async loadFromXML(filePath) {
        // TODO: Implement XML parsing (using xml2js or similar)
        return new Map();
    }

    /**
     * Finds and returns a node by its ID
     * @param {string|number} id - Node identifier
     * @returns {Node|null}
     */
    getNodeById(id) {
        return this.nodes.find(n => n.id == id) || null;
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
     * Returns a JSON representation of the map
     * @returns {Object}
     */
    toJSON() {
        return {
            nodes: this.nodes,
            segments: this.segments,
            warehouse: this.warehouse
        };
    }

    /**
     * Returns a textual summary of the map
     * @returns {string}
     */
    toString() {
        return `Map - ${this.nodes.length} nodes, ${this.segments.length} segments, warehouse: ${
            this.warehouse ? this.warehouse.id : 'None'
        }`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Map;
}
