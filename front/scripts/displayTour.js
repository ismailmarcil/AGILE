/**
 * DisplayTour - Simple class to display a Tour on a Leaflet map
 * Takes a Tour object and displays its itinerary with pickup/delivery points
 */

class DisplayTour {
    /**
     * Constructor
     * @param {string} mapElementId - ID of the HTML element to contain the map
     */
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.initMap();
    }

    /**
     * Initialize the Leaflet map
     */
    initMap() {
        // Create map centered on Lyon
        this.map = L.map(this.mapElementId).setView([45.75, 4.85], 13);

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        console.log('Map initialized');
    }

    /**
     * Display a tour on the map
     * @param {Tour} tour - The Tour object to display
     */
    displayTour(tour) {
        if (!tour) {
            console.error('No tour provided');
            return;
        }

        console.log('Displaying tour:', tour);

        // Clear existing layers
        this.clearMap();

        // Display the legs (paths between stops)
        this.displayLegs(tour.legs);

        // Display tour stops
        this.displayStops(tour.stops);

        // Fit map to show all points
        this.fitMapToTour(tour);
    }

    /**
     * Display the legs (paths between tour points)
     * @param {Array<Leg>} legs - Array of Leg objects
     */
    displayLegs(legs) {
        if (!legs || legs.length === 0) {
            console.log('No legs to display');
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

        console.log(`${legs.length} legs displayed`);
    }

    /**
     * Display tour stops (pickup/delivery/warehouse points)
     * @param {Array<TourPoint>} stops - Array of TourPoint objects
     */
    displayStops(stops) {
        if (!stops || stops.length === 0) {
            console.log('No stops to display');
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

        console.log(`${stops.length} stops displayed`);
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

    /**
     * Clear all elements from the map
     */
    clearMap() {
        // Remove all layers except the base tile layer
        this.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                return; // Keep the base tile layer
            }
            this.map.removeLayer(layer);
        });

        console.log('Map cleared');
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DisplayTour;
}

