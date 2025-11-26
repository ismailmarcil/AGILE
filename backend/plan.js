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
     * Loads a Plan from an XML file (only works in Node.js environment)
     * @param {string} filePath - Path to the XML file
     * @returns {Promise<Plan>} The loaded Plan
     */
    static async loadFromXML(filePath) {
        // Check if we're in Node.js environment
        if (typeof require === 'undefined') {
            throw new Error('loadFromXML can only be used in Node.js environment');
        }

        const fs = require("fs");
        const xml2js = require("xml2js");
        
        // 1) Read the XML file
        const xmlContent = await fs.promises.readFile(filePath, "utf-8");
    
        // 2) Convert to JSON with xml2js
        const json = await xml2js.parseStringPromise(xmlContent);
    
        const root = json.reseau;
    
        // Empty plan
        const plan = new Plan(new Map(), [], null);
    
        // ----------------------------
        // 3) Load the nodes
        // ----------------------------
        if (root.noeud) {
            for (const n of root.noeud) {
                const id = n.$.id;
                const latitude = parseFloat(n.$.latitude);
                const longitude = parseFloat(n.$.longitude);
    
                // Each node contains a list of segments
                const node = new Node(id, latitude, longitude);
                node.segments = [];   // to store the segments for each node
    
                plan.nodes.set(id, node);
            }
        }
    
        // ----------------------------
        // 4) Load the segments
        // ----------------------------
        if (root.troncon) {
            for (const t of root.troncon) {
                const originId = t.$.origine;
                const destinationId = t.$.destination;
                const streetName = t.$.nomRue;
                const length = parseFloat(t.$.longueur);
    
                const originNode = plan.nodes.get(originId);
                const destinationNode = plan.nodes.get(destinationId);
    
                if (!originNode || !destinationNode) {
                    console.warn(`Skipping segment: node ${originId} or ${destinationId} not found`);
                    continue;
                }
    
                const segment = new Segment(originNode, destinationNode, streetName, length);
    
                // Add the segment to the list of segments of the plan
                plan.segments.push(segment);
    
                // Add the segment the list of segments of the node
                originNode.segments.push(segment);
            }
        }
    
        return plan;
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
        return this.segments.filter(e => e.origin.id == nodeId);
    }

    /**
     * Returns a JSON representation of the plan
     * @returns {Object}
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
            segments: this.segments.map(segment => segment.toJSON()),
            warehouse: this.warehouse ? this.warehouse.toJSON() : null
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

// Export for Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Plan;
}

if (typeof window !== 'undefined') {
    window.Plan = Plan;
}
