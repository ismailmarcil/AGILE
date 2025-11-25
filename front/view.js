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

        // Display the itinerary (path)
        this.displayItinerary(tour.itinerary);

        // Display pickup and delivery points
        this.displayTourPickupDeliveryPoints(tour.pickupDeliveryPointsList);

        // Fit map to show all points
        this.fitMapToTour(tour);
    }

    /**
     * Display the itinerary (path between nodes)
     * @param {Array<Node>} itinerary - Array of Node objects
     */
    displayItinerary(itinerary) {
        if (!itinerary || itinerary.length === 0) {
            console.log('View: No itinerary to display');
            return;
        }

        // Create array of coordinates for the path
        const pathCoordinates = itinerary.map(node => [node.latitude, node.longitude]);

        // Draw the path
        const pathLine = L.polyline(pathCoordinates, {
            color: '#ff0000',
            weight: 4,
            opacity: 0.7
        }).addTo(this.map);

        pathLine.bindPopup('Itinéraire de la tournée');

        // Add markers for each node in itinerary
        itinerary.forEach((node, index) => {
            const isFirst = index === 0;
            const isLast = index === itinerary.length - 1;

            let markerColor = 'blue';
            let markerLabel = `Noeud ${index + 1}`;

            if (isFirst) {
                markerColor = 'green';
                markerLabel = 'Départ (Entrepôt)';
            } else if (isLast) {
                markerColor = 'green';
                markerLabel = 'Retour (Entrepôt)';
            }

            const marker = L.circleMarker([node.latitude, node.longitude], {
                radius: 5,
                fillColor: markerColor,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);

            marker.bindPopup(`
                <strong>${markerLabel}</strong><br>
                ID: ${node.id}<br>
                Lat: ${node.latitude.toFixed(6)}<br>
                Lon: ${node.longitude.toFixed(6)}
            `);
        });

        console.log(`View: Itinerary displayed with ${itinerary.length} nodes`);
    }

    /**
     * Display pickup and delivery points on the tour
     * @param {Array} pickupDeliveryPointsList - Array of pickup/delivery points
     */
    displayTourPickupDeliveryPoints(pickupDeliveryPointsList) {
        if (!pickupDeliveryPointsList || pickupDeliveryPointsList.length === 0) {
            console.log('View: No pickup/delivery points to display');
            return;
        }

        pickupDeliveryPointsList.forEach((point, index) => {
            const tourPoint = point.tourPoint;

            if (!tourPoint || !tourPoint.address) {
                return;
            }

            const address = tourPoint.address;
            const isPickup = tourPoint.type === 'pickup';

            // Create marker with icon
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${isPickup ? '#FFA500' : '#4CAF50'}; 
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

            const marker = L.marker([address.latitude, address.longitude], { icon: icon })
                .addTo(this.map);

            marker.bindPopup(`
                <strong>${isPickup ? '📦 Pickup' : '🏠 Delivery'} #${index + 1}</strong><br>
                Arrivée: ${point.arrivalTime}<br>
                Départ: ${point.departureTime}<br>
                Adresse ID: ${address.id}
            `);
        });

        console.log(`View: ${pickupDeliveryPointsList.length} pickup/delivery points displayed`);
    }

    /**
     * Fit the map to show the entire tour
     * @param {Tour} tour - The Tour object
     */
    fitMapToTour(tour) {
        const bounds = [];

        // Add itinerary points to bounds
        if (tour.itinerary && tour.itinerary.length > 0) {
            tour.itinerary.forEach(node => {
                bounds.push([node.latitude, node.longitude]);
            });
        }

        // Add pickup/delivery points to bounds
        if (tour.pickupDeliveryPointsList && tour.pickupDeliveryPointsList.length > 0) {
            tour.pickupDeliveryPointsList.forEach(point => {
                if (point.tourPoint && point.tourPoint.address) {
                    const address = point.tourPoint.address;
                    bounds.push([address.latitude, address.longitude]);
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