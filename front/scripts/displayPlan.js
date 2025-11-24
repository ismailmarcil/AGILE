/**
 * DisplayPlan - Class to display a full city plan (nodes + segments) on a Leaflet map.
 * 
 */

class DisplayPlan {

    /**
     * Constructor
     * @param {string} mapElementId - ID of the HTML element containing the map
     */
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.nodeMap = new Map();

        this.initMap();
    }

    /**
     * Initialize Leaflet map.
     * The map will be centered automatically using fitMapToPlan().
     */
    initMap() {
        this.map = L.map(this.mapElementId);

        // Base tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this.map);

        console.log("DisplayPlan: Map initialized");
    }

    /**
     * Main method to display the plan.
     * @param {Object} planJSON - JSON returned by Plan.toJSON()
     */
    displayPlan(planJSON) {
        if (!planJSON) {
            console.error("DisplayPlan: No plan JSON provided.");
            return;
        }

        this.clearMap();

        // Convert node array into a Map<id, node>
        this.nodeMap = new Map(planJSON.nodes.map(n => [n.id, n]));

        // Draw segments first (lines)
        this.displaySegments(planJSON.segments);

        // Draw nodes second (so they appear above the lines)
        this.displayNodes(planJSON.nodes);

        // Adjust zoom automatically
        this.fitMapToPlan(planJSON.nodes);

        console.log("DisplayPlan: Plan displayed.");
    }

    /**
     * Draw all nodes as blue circle markers.
     */
    displayNodes(nodes) {
        nodes.forEach(node => {
            L.circleMarker([node.latitude, node.longitude], {
                radius: 3,
                fillColor: "blue",
                color: "black",
                weight: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
        });

        console.log(`DisplayPlan: ${nodes.length} nodes drawn.`);
    }

    /**
     * Draw all segments as gray polylines.
     */
    displaySegments(segments) {
        segments.forEach(seg => {

            const origin = this.nodeMap.get(seg.origin);
            const dest = this.nodeMap.get(seg.destination);

            if (!origin || !dest) return;

            L.polyline(
                [
                    [origin.latitude, origin.longitude],
                    [dest.latitude, dest.longitude]
                ],
                {
                    color: "gray",
                    weight: 2,
                    opacity: 0.5
                }
            ).addTo(this.map);
        });

        console.log(`DisplayPlan: ${segments.length} segments drawn.`);
    }

    /**
     * Automatically adjust the map view to include all nodes.
     */
    fitMapToPlan(nodes) {
        const bounds = nodes.map(n => [n.latitude, n.longitude]);

        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    /**
     * Remove all layers except the base tile layer.
     */
    clearMap() {
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) return; // keep OSM tiles
            this.map.removeLayer(layer);
        });
    }
}

// Export for Node.js (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DisplayPlan;
}
