/**
 * Class representing a delivery tour
 */
class Tour {
    /**
     * Constructor for the Tour class
     * @param {string} departureTime - Departure time in HH:MM format (LocalTime)
     * @param {Courier} courier - The courier assigned to the tour
     */
    constructor(departureTime, courier) {
        this.departureTime = departureTime; // LocalTime format: "HH:MM"
        this.courier = courier; // Courier object

        // List<TourPoint, LocalTime, LocalTime> : pickupDeliveryPointsList
        // For each point, we store the arrival time and departure time for the tour
        // Each element: { tourPoint: TourPoint, arrivalTime: string, departureTime: string }
        this.pickupDeliveryPointsList = [];

        // List<Node> : Itinerary - Global itinerary of the tour (list of nodes)
        this.itinerary = [];

        // Total duration of the tour in minutes
        this.totalDuration = 0;

        // Total distance of the tour in meters
        this.totalDistance = 0;
    }

    /**
     * Adds a pickup/delivery point to the tour
     * @param {TourPoint} tourPoint - The point to add
     * @param {string} arrivalTime - Arrival time in HH:MM format
     * @param {string} departureTime - Departure time in HH:MM format
     */
    addPoint(tourPoint, arrivalTime, departureTime) {
        this.pickupDeliveryPointsList.push({
            tourPoint: tourPoint,
            arrivalTime: arrivalTime,
            departureTime: departureTime
        });
    }

    /**
     * Calculates and returns the complete itinerary of the tour
     * @param {Array} pickupDeliveryPointsList - List of points with their schedules
     * @returns {Array<Node>} The complete itinerary (list of nodes)
     */
    getItinerary(pickupDeliveryPointsList) {
        // TODO: Implement the itinerary calculation algorithm
        // This should calculate the shortest path through all points
        this.itinerary = [];
        return this.itinerary;
    }

    /**
     * Calculates the total duration of the tour
     * @returns {number} Duration in minutes
     */
    calculateTotalDuration() {
        if (this.pickupDeliveryPointsList.length === 0) {
            this.totalDuration = 0;
            return this.totalDuration;
        }

        // Calculate between departure time and end time of the last point
        const lastPoint = this.pickupDeliveryPointsList[this.pickupDeliveryPointsList.length - 1];
        this.totalDuration = this.calculateTimeDifference(this.departureTime, lastPoint.departureTime);

        return this.totalDuration;
    }

    /**
     * Calculates the total distance of the tour
     * @returns {number} Distance in meters
     */
    calculateTotalDistance() {
        for (const node of this.itinerary) {
            if (node.segment) {
                this.totalDistance += node.segment.length;
            }
        }
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
            departureTime: this.departureTime,
            courier: this.courier,
            pickupDeliveryPointsList: this.pickupDeliveryPointsList,
            itinerary: this.itinerary,
            totalDuration: this.totalDuration,
            totalDistance: this.totalDistance
        };
    }

    /**
     * Displays a summary of the tour
     * @returns {string} Textual summary of the tour
     */
    toString() {
        return `Tour - Departure: ${this.departureTime}, Courier: ${this.courier ? this.courier.name : 'Unassigned'}, Points: ${this.pickupDeliveryPointsList.length}, Duration: ${this.totalDuration}min, Distance: ${this.totalDistance}m`;
    }

    /**
     * Generates an XML representation of the tour's itinerary
     * The itinerary should contain nodes with their associated segments
     * Each node in the itinerary should have a property 'segment' that represents the segment to reach the next node
     * @returns {string} XML string representing the tour's itinerary in the same format as the map plan
     */
    toXML() {
        let xml = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
        xml += '<reseau>\n';

        // Add all nodes from the itinerary with their coordinates
        for (const node of this.itinerary) {
            xml += `<noeud id="${node.id}" latitude="${node.latitude}" longitude="${node.longitude}"/>\n`;
        }

        // Add all segments from the itinerary
        // Each node (except the last) should have a segment property that represents the edge to the next node
        for (let i = 0; i < this.itinerary.length - 1; i++) {
            const node = this.itinerary[i];

            // Check if the node has an associated segment to the next node
            if (node.segment) {
                const segment = node.segment;
                xml += `<troncon destination="${segment.destination}" longueur="${segment.length}" nomRue="${segment.streetName}" origine="${segment.origin}"/>\n`;
            }
        }

        xml += '</reseau>';
        return xml;
    }

    /**
     * Saves the tour's itinerary to an XML file
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
                console.log(`Tour itinerary saved to: ${filePath}`);
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