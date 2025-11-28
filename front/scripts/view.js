class View {
    constructor(startTime, mapElementId) {
        this.startTime = startTime;
        this.listPickupDeliveryPoints = []; // Array of {tourPoint, startTime, endTime}
        this.pairPickupDelivery = []; // Array of {fromTourPoint, toTourPoint}

        // Map display properties
        this.mapElementId = mapElementId;
        this.map = null;
        this.nodeMap = new Map();

        if (mapElementId) {
            this.initMap();
        }
    }

    /**
     * Initialize the Leaflet map.
     */
    initMap() {
        this.map = L.map(this.mapElementId);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this.map);

        console.log("View: Map initialized");
    }

    /**
     * Display the full plan from { nodes: [...], segments: [...] }
     */
    displayPlan(planJSON) {
        if (!planJSON) {
            console.error("View: planJSON is null");
            return;
        }

        this.clearMap();

        this.nodeMap = new Map(planJSON.nodes.map(n => [n.id, n]));

        this.displaySegments(planJSON.segments);
        this.displayNodes(planJSON.nodes);
        this.fitMapToPlan(planJSON.nodes);

        console.log("View: Plan displayed");
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
                weight: 2,
                fillOpacity: 0.9
            }).addTo(this.map);
        });
    }

    /**
     * Draw segments as red lines
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
                    color: "red",
                    weight: 4,
                    opacity: 0.9
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

    /**
     * Display a tour on the map
     * @param {Tour} tour - The Tour object to display
     */
    displayTour(tour) {
        if (!tour) {
            console.error('View: No tour provided');
            return;
        }

        console.log('View: Displaying tour:', tour);

        // Clear existing layers
        this.clearMap();

        // Display the legs (paths between stops)
        this.displayLegs(tour.legs);

        // Display tour stops
        this.displayTourStops(tour.stops);

        // Fit map to show all points
        this.fitMapToTour(tour);
    }

    /**
     * Display the legs (paths between tour points)
     * @param {Array<Leg>} legs - Array of Leg objects
     */
    displayLegs(legs) {
        if (!legs || legs.length === 0) {
            console.log('View: No legs to display');
            return;
        }

        legs.forEach((leg, index) => {
            if (!leg.path || leg.path.length === 0) return;

            // Create array of coordinates for the path
            const pathCoordinates = leg.path.map(node => [node.latitude, node.longitude]);

            // Draw the path
            const pathLine = L.polyline(pathCoordinates, {
                color: '#ff0000',
                weight: 4,
                opacity: 0.7
            }).addTo(this.map);

            pathLine.bindPopup(`
                <strong>Segment ${index + 1}</strong><br>
                Distance: ${(leg.distance / 1000).toFixed(2)} km<br>
                Durée: ${Math.round(leg.travelTime / 60)} min
            `);
        });

        console.log(`View: ${legs.length} legs displayed`);
    }

    /**
     * Display tour stops (pickup/delivery/warehouse points)
     * @param {Array<TourPoint>} stops - Array of TourPoint objects
     */
    displayTourStops(stops) {
        if (!stops || stops.length === 0) {
            console.log('View: No stops to display');
            return;
        }

        stops.forEach((tourPoint, index) => {
            if (!tourPoint || !tourPoint.node) {
                return;
            }

            const node = tourPoint.node;
            const isWarehouse = tourPoint.type === 'ENTREPOT';
            const isPickup = tourPoint.type === 'PICKUP';
            const isDelivery = tourPoint.type === 'DELIVERY';

            let markerColor = 'blue';
            let label = 'Point';

            if (isWarehouse) {
                markerColor = 'green';
                label = '🏠 Entrepôt';
            } else if (isPickup) {
                markerColor = '#FFA500';
                label = '📦 Pickup';
            } else if (isDelivery) {
                markerColor = '#4CAF50';
                label = '🏠 Delivery';
            }

            // Create marker with icon
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${markerColor}; 
                              width: 30px; height: 30px; 
                              border-radius: 50%; 
                              border: 2px solid white;
                              display: flex; 
                              align-items: center; 
                              justify-content: center;
                              font-weight: bold;
                              color: white;">
                        ${index + 1}
                      </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([node.latitude, node.longitude], { icon: icon })
                .addTo(this.map);

            marker.bindPopup(`
                <strong>${label} #${index + 1}</strong><br>
                Type: ${tourPoint.type}<br>
                Durée: ${tourPoint.serviceDuration}s<br>
                Noeud ID: ${node.id}
                ${tourPoint.demand ? `<br>Demande ID: ${tourPoint.demand.id || 'N/A'}` : ''}
            `);
        });

        console.log(`View: ${stops.length} stops displayed`);
    }

    /**
     * Fit the map to show the entire tour
     * @param {Tour} tour - The Tour object
     */
    fitMapToTour(tour) {
        const bounds = [];

        // Add all nodes from legs to bounds
        if (tour.legs && tour.legs.length > 0) {
            tour.legs.forEach(leg => {
                if (leg.path && leg.path.length > 0) {
                    leg.path.forEach(node => {
                        bounds.push([node.latitude, node.longitude]);
                    });
                }
            });
        }

        // Add stop points to bounds
        if (tour.stops && tour.stops.length > 0) {
            tour.stops.forEach(tourPoint => {
                if (tourPoint.node) {
                    bounds.push([tourPoint.node.latitude, tourPoint.node.longitude]);
                }
            });
        }

        // Fit map to bounds
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // Existing methods
    addPickupDeliveryPoint(tourPoint, startTime, endTime) {
        this.listPickupDeliveryPoints.push({ tourPoint, startTime, endTime });
    }

    addPickupDeliveryPair(fromTourPoint, toTourPoint) {
        this.pairPickupDelivery.push({ fromTourPoint, toTourPoint });
    }

    getPickupDeliveryPoints() {
        return this.listPickupDeliveryPoints;
    }

    getPickupDeliveryPairs() {
        return this.pairPickupDelivery;
    }

    setStartTime(time) {
        this.startTime = time;
    }

    getStartTime() {
        return this.startTime;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = View;
}