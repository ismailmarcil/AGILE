/**
 * Class representing a courier (delivery person)
 */
class Courier {
    /**
     * Unique identifier of the courier
     * @type {string|number}
     */
    id;

    /**
     * Name of the courier
     * @type {string}
     */
    name;

    /**
     * Constructor for the Courier class
     * @param {string|number} id - Unique identifier
     * @param {string} name - Courier name
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    /**
     * Returns a JSON representation of the courier
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name
        };
    }

    /**
     * Returns a textual summary of the courier
     * @returns {string}
     */
    toString() {
        return `Courier ${this.id} - ${this.name}`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Courier;
}
