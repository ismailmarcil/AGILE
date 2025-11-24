/**
 * DisplayPlan - Display a full city plan (nodes + segments) on Leaflet.
*/

class DisplayPlan {

    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.nodeMap = new Map();
        this.initMap();
    }

    /**
     * Initialize the Leaflet map.
     * fitMapToPlan() will set the zoom once the plan is drawn.
     */
    initMap() {
        this.map = L.map(this.mapElementId);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this.map);

        console.log("DisplayPlan: Map initialized");
    }

    /**
     * Display the full plan from { nodes: [...], segments: [...] }
     */
    displayPlan(planJSON) {
        if (!planJSON) {
            console.error("DisplayPlan: planJSON is null");
            return;
        }

        this.clearMap();

        this.nodeMap = new Map(planJSON.nodes.map(n => [n.id, n]));

        this.displaySegments(planJSON.segments);
        this.displayNodes(planJSON.nodes);
        this.fitMapToPlan(planJSON.nodes);

        console.log("DisplayPlan: Plan displayed");
    }

    /**
     * Draw nodes as blue dots
     */
    displayNodes(nodes) {
        nodes.forEach(node => {
            L.circleMarker([node.latitude, node.longitude], {
                radius: 3,
                fillColor: "blue",
                color: "#000",
                weight: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
        });
    }

    /**
     * Draw segments as gray lines
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
    }

    /**
     * Automatic map zoom based on all node positions
     */
    fitMapToPlan(nodes) {
        if (nodes.length === 0) return;
        const bounds = nodes.map(n => [n.latitude, n.longitude]);
        this.map.fitBounds(bounds, { padding: [20, 20] });
    }

    /**
     * Clear all drawn layers except tile layer
     */
    clearMap() {
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) return;
            this.map.removeLayer(layer);
        });
    }
}

// Export for Node
if (typeof module !== "undefined" && module.exports) {
    module.exports = DisplayPlan;
}
