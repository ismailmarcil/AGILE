/**
 * Class representing a delivery tour
 */
class Tour {
    /**
     * Constructor for the Tour class
     * @param {string|null} id - Tour ID (auto-generated if null)
     * @param {string} departureTime - Departure time in HH:MM format
     * @param {Courier} courier - The courier assigned to the tour
     */
    constructor(id, departureTime, courier) {
        this.id = id !== null ? id : `T_${courier ? courier.id : 'UNKNOWN'}_${Date.now()}`;
        this.departureTime = departureTime;
        this.courier = courier;
        this.stops = []; // Array<TourPoint>
        this.legs = []; // Array<Leg>
        this.totalDuration = 0; // Total duration in seconds
        this.totalDistance = 0; // Total distance in meters
    }

    /**
     * Adds a stop to the tour
     * @param {TourPoint} tourPoint - The tour point to add
     */
    addStop(tourPoint) {
        this.stops.push(tourPoint);
    }

    /**
     * Adds a leg to the tour
     * @param {Leg} leg - The leg to add
     */
    addLeg(leg) {
        this.legs.push(leg);
    }

    /**
     * Calculates the total duration of the tour from all legs and service durations
     * @returns {number} Duration in seconds
     */
    calculateTotalDuration() {
        let duration = 0;
        
        // Add travel time from all legs
        for (const leg of this.legs) {
            duration += leg.travelTime;
        }
        
        // Add service duration from all stops
        for (const stop of this.stops) {
            duration += stop.serviceDuration;
        }
        
        this.totalDuration = duration;
        return this.totalDuration;
    }

    /**
     * Calculates the total distance of the tour from all legs
     * @returns {number} Distance in meters
     */
    calculateTotalDistance() {
        let distance = 0;
        
        for (const leg of this.legs) {
            distance += leg.distance;
        }
        
        this.totalDistance = distance;
        return this.totalDistance;
    }

    /**
     * Calculates the difference between two times in minutes
     * @param {string} time1 - First time (HH:MM)
     * @param {string} time2 - Second time (HH:MM)
     * @returns {number} Difference in minutes
     */
    calculateTimeDifference(time1, time2) {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);

        const minutes1 = h1 * 60 + m1;
        const minutes2 = h2 * 60 + m2;

        return Math.abs(minutes2 - minutes1);
    }

    /**
     * Returns a JSON representation of the tour
     * @returns {Object} JSON object representing the tour
     */
    toJSON() {
        return {
            id: this.id,
            departureTime: this.departureTime,
            courier: this.courier ? this.courier.toJSON() : null,
            stops: this.stops.map(stop => stop.toJSON()),
            legs: this.legs.map(leg => leg.toJSON()),
            totalDuration: this.totalDuration,
            totalDistance: this.totalDistance
        };
    }

    /**
     * Displays a summary of the tour
     * @returns {string} Textual summary of the tour
     */
    toString() {
        return `Tour ${this.id} - Departure: ${this.departureTime}, Courier: ${this.courier ? this.courier.name : 'Unassigned'}, Stops: ${this.stops.length}, Legs: ${this.legs.length}, Duration: ${this.totalDuration}s, Distance: ${this.totalDistance}m`;
    }

    /**
     * Generates an XML representation of the tour
     * @returns {string} XML string representing the tour
     */
    toXML() {
        let xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
        xml += '<reseau>\n';

        // Collect all unique nodes from legs
        const nodesMap = new Map();
        for (const leg of this.legs) {
            for (const node of leg.path) {
                nodesMap.set(node.id, node);
            }
        }

        // Add all nodes
        for (const node of nodesMap.values()) {
            xml += `<noeud id="${node.id}" latitude="${node.latitude}" longitude="${node.longitude}"/>\n`;
        }

        // Add segments from node paths in legs
        for (const leg of this.legs) {
            for (let i = 0; i < leg.path.length - 1; i++) {
                const fromNode = leg.path[i];
                const toNode = leg.path[i + 1];
                
                // Find the segment between these nodes
                const segment = fromNode.segments.find(seg => seg.destination.id === toNode.id);
                if (segment) {
                    xml += `<troncon origine="${segment.origin.id}" destination="${segment.destination.id}" nomRue="${segment.streetName}" longueur="${segment.length}"/>\n`;
                }
            }
        }

        xml += '</reseau>';
        return xml;
    }

    /**
     * Saves the tour to an XML file
     * @param {string} filename - Name of the file to save (without extension)
     * @returns {string} The XML content that was saved
     */
    saveItineraryToXML(filename = 'tour_itinerary') {
        const xml = this.toXML();

        // In a Node.js environment, write to file
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');

                // Save in the same directory as the map XML files
                const filePath = path.join(__dirname, '..', 'fichiersXMLPickupDelivery', `${filename}.xml`);
                fs.writeFileSync(filePath, xml, 'utf8');
                console.log(`Tour saved to: ${filePath}`);
            } catch (error) {
                console.error('Error saving XML file:', error);
            }
        }

        return xml;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tour;
}