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

        // Display the itinerary (path)
        this.displayItinerary(tour.itinerary);

        // Display pickup and delivery points
        this.displayPickupDeliveryPoints(tour.pickupDeliveryPointsList);

        // Fit map to show all points
        this.fitMapToTour(tour);
    }

    /**
     * Display the itinerary (path between nodes)
     * @param {Array<Node>} itinerary - Array of Node objects
     */
    displayItinerary(itinerary) {
        if (!itinerary || itinerary.length === 0) {
            console.log('No itinerary to display');
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

        console.log(`Itinerary displayed with ${itinerary.length} nodes`);
    }

    /**
     * Display pickup and delivery points
     * @param {Array} pickupDeliveryPointsList - Array of pickup/delivery points
     */
    displayPickupDeliveryPoints(pickupDeliveryPointsList) {
        if (!pickupDeliveryPointsList || pickupDeliveryPointsList.length === 0) {
            console.log('No pickup/delivery points to display');
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

        console.log(`${pickupDeliveryPointsList.length} pickup/delivery points displayed`);
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

