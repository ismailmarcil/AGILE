/**
 * Class representing a Pickup & Delivery request
 */
class Demand {

    /**
     * Constructor for the Demand class
     * @param {string|number} pickupAddress - Node ID for pickup
     * @param {string|number} deliveryAddress - Node ID for delivery
     * @param {number} pickupDuration - Duration at pickup (seconds)
     * @param {number} deliveryDuration - Duration at delivery (seconds)
     */
    constructor(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration) {
        this.pickupAddress = pickupAddress;
        this.deliveryAddress = deliveryAddress;
        this.pickupDuration = pickupDuration;
        this.deliveryDuration = deliveryDuration;
    }

    /**
     * Returns a JSON representation of the demand
     * @returns {Object}
     */
    toJSON() {
        return {
            pickupAddress: this.pickupAddress,
            deliveryAddress: this.deliveryAddress,
            pickupDuration: this.pickupDuration,
            deliveryDuration: this.deliveryDuration
        };
    }

    /**
     * Returns a textual summary of the demand
     * @returns {string}
     */
    toString() {
        return `Demand - Pickup at ${this.pickupAddress} (${this.pickupDuration}s), Delivery at ${this.deliveryAddress} (${this.deliveryDuration}s)`;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Demand;
}
