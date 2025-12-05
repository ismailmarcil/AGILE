class View {
    constructor(startTime, mapElementId) {
        this.startTime = startTime;
        this.listPickupDeliveryPoints = []; // Array of {tourPoint, startTime, endTime}
        this.pairPickupDelivery = []; // Array of {fromTourPoint, toTourPoint}

        // Map display properties
        this.mapElementId = mapElementId;
        this.map = null;
        this.nodeMap = new Map();
        this.tourMarkers = []; // Array to store markers for each stop
        this.selectedMarker = null; // Currently selected marker
        this.selectedStopIndex = null; // Currently selected stop index

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
     * Draw nodes as blue dots (légers pour ne pas dominer la carte)
     */
    displayNodes(nodes) {
        nodes.forEach(node => {
            L.circleMarker([node.latitude, node.longitude], {
                radius: 2,
                fillColor: "#95a5a6",
                color: "#7f8c8d",
                weight: 1,
                fillOpacity: 0.3,
                opacity: 0.4
            }).addTo(this.map);
        });
    }

    /**
     * Draw segments as red lines (légers pour ne pas dominer la carte)
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
                    color: "#bdc3c7",
                    weight: 2,
                    opacity: 0.4
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
        this.tourMarkers = [];
        this.selectedMarker = null;
        this.selectedStopIndex = null;
    }

    /**
     * Display demands on the map (pickup and delivery points)
     * @param {Array<Demand>} demands - Array of Demand objects
     * @param {Plan} plan - The Plan object to get node coordinates
     */
    displayDemands(demands, plan) {
        if (!demands || demands.length === 0) {
            console.log('View: No demands to display');
            return;
        }

        if (!plan) {
            console.error('View: Plan is required to display demands');
            return;
        }

        demands.forEach((demand, index) => {
            // Get pickup node
            const pickupNode = plan.getNodeById(demand.pickupAddress);
            if (pickupNode) {
                const pickupIcon = L.divIcon({
                    className: 'demand-marker',
                    html: `<div style="
                        background-color: #e67e22;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 11px;
                        color: white;
                    ">P${index + 1}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const pickupMarker = L.marker([pickupNode.latitude, pickupNode.longitude], {
                    icon: pickupIcon,
                    zIndexOffset: 1000
                }).addTo(this.map);

                pickupMarker.bindPopup(`
                    <strong>📦 Pickup ${index + 1}</strong><br>
                    Client: ${demand.clientName || 'N/A'}<br>
                    Durée: ${Math.round(demand.pickupDuration / 60)} min<br>
                    Node ID: ${pickupNode.id}<br>
                    Coords: (${pickupNode.latitude.toFixed(4)}, ${pickupNode.longitude.toFixed(4)})
                `);
            }

            // Get delivery node
            const deliveryNode = plan.getNodeById(demand.deliveryAddress);
            if (deliveryNode) {
                const deliveryIcon = L.divIcon({
                    className: 'demand-marker',
                    html: `<div style="
                        background-color: #27ae60;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 11px;
                        color: white;
                    ">D${index + 1}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const deliveryMarker = L.marker([deliveryNode.latitude, deliveryNode.longitude], {
                    icon: deliveryIcon,
                    zIndexOffset: 1000
                }).addTo(this.map);

                deliveryMarker.bindPopup(`
                    <strong>🏠 Delivery ${index + 1}</strong><br>
                    Client: ${demand.clientName || 'N/A'}<br>
                    Durée: ${Math.round(demand.deliveryDuration / 60)} min<br>
                    Node ID: ${deliveryNode.id}<br>
                    Coords: (${deliveryNode.latitude.toFixed(4)}, ${deliveryNode.longitude.toFixed(4)})
                `);
            }

        });

        console.log(`View: ${demands.length} demands displayed on map`);
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
            const pathNodes = leg.pathNode || [];
            if (pathNodes.length === 0) return;

            // Create array of coordinates for the path
            const pathCoordinates = pathNodes.map(node => [node.latitude, node.longitude]);

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

        // Clear previous markers array
        this.tourMarkers = [];

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
                markerColor = '#2C3E50';
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
                html: `<div class="tour-marker" data-stop-index="${index}" style="background-color: ${markerColor}; 
                              width: 30px; height: 30px; 
                              border-radius: 50%; 
                              border: 2px solid white;
                              display: flex; 
                              align-items: center; 
                              justify-content: center;
                              font-weight: bold;
                              color: white;
                              transition: all 0.2s;">
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

            // Store marker with its index and original color
            this.tourMarkers.push({
                marker: marker,
                index: index,
                node: node,
                tourPoint: tourPoint,
                originalColor: markerColor
            });

            // Add click event to marker
            marker.on('click', () => {
                this.highlightStop(index);
            });
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
                const pathNodes = leg.pathNode || [];
                if (pathNodes.length > 0) {
                    pathNodes.forEach(node => {
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

    displayTourDetails(tour, summaryElement, tableBodyElement) {
        if (!summaryElement || !tableBodyElement) return;

        // Si on veut juste nettoyer
        if (!tour) {
            summaryElement.textContent = "";
            tableBodyElement.innerHTML = "";
            return;
        }

        const totalKm = (tour.totalDistance / 1000).toFixed(2);
        const totalMin = Math.round(tour.totalDuration / 60);
        summaryElement.textContent =
            `Tournée ${tour.id} – départ ${tour.departureTime}, ` +
            `distance totale ${totalKm} km, durée totale ~${totalMin} min`;

        tableBodyElement.innerHTML = "";

        let currentSec = this._timeToSeconds(tour.departureTime);

        tour.stops.forEach((stop, index) => {
            const arrivalTime = this._secondsToTime(currentSec);
            const serviceSec = stop.serviceDuration || 0;
            const departureTime = this._secondsToTime(currentSec + serviceSec);

            const tr = document.createElement("tr");

            const tdIndex = document.createElement("td");
            tdIndex.textContent = index + 1;

            const tdType = document.createElement("td");
            tdType.textContent = stop.type;

            const tdNode = document.createElement("td");
            tdNode.textContent = stop.node ? stop.node.id : "";

            const tdDemand = document.createElement("td");
            tdDemand.textContent = stop.demand ? stop.demand.id : "";

            const tdArr = document.createElement("td");
            tdArr.textContent = arrivalTime;

            const tdServ = document.createElement("td");
            tdServ.textContent = Math.round(serviceSec / 60);

            const tdDep = document.createElement("td");
            tdDep.textContent = departureTime;

            tr.appendChild(tdIndex);
            tr.appendChild(tdType);
            tr.appendChild(tdNode);
            tr.appendChild(tdDemand);
            tr.appendChild(tdArr);
            tr.appendChild(tdServ);
            tr.appendChild(tdDep);
            tableBodyElement.appendChild(tr);

            currentSec += serviceSec;
            if (index < tour.legs.length) {
                currentSec += tour.legs[index].travelTime || 0;
            }
        });
    }

    _timeToSeconds(hhmm) {
        const parts = (hhmm || "00:00").split(":").map(Number);
        const h = parts[0] || 0;
        const m = parts[1] || 0;
        return h * 3600 + m * 60;
    }

    _secondsToTime(sec) {
        sec = Math.max(0, Math.floor(sec));
        const h = Math.floor(sec / 3600) % 24;
        const m = Math.floor((sec % 3600) / 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }


    /**
     * Highlight a specific stop on the map and timeline
     * @param {number} stopIndex - Index of the stop to highlight
     */
    highlightStop(stopIndex) {
        if (!this.tourMarkers || this.tourMarkers.length === 0) {
            console.log('View: No markers to highlight');
            return;
        }

        // Reset previous selection
        if (this.selectedStopIndex !== null && this.selectedStopIndex !== stopIndex) {
            const prevMarkerData = this.tourMarkers[this.selectedStopIndex];
            if (prevMarkerData) {
                const prevElement = prevMarkerData.marker.getElement();
                if (prevElement) {
                    const prevIcon = prevElement.querySelector('.tour-marker');
                    if (prevIcon) {
                        prevIcon.style.backgroundColor = prevMarkerData.originalColor;
                        prevIcon.style.width = '30px';
                        prevIcon.style.height = '30px';
                        prevIcon.style.boxShadow = 'none';
                        prevIcon.style.zIndex = '1000';
                    }
                }
            }
        }

        // Highlight new selection
        const markerData = this.tourMarkers[stopIndex];
        if (markerData) {
            this.selectedStopIndex = stopIndex;
            this.selectedMarker = markerData.marker;

            // Highlight on map
            const element = markerData.marker.getElement();
            if (element) {
                const icon = element.querySelector('.tour-marker');
                if (icon) {
                    icon.style.backgroundColor = '#3498db';
                    icon.style.width = '40px';
                    icon.style.height = '40px';
                    icon.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.8)';
                    icon.style.zIndex = '2000';
                }
            }

            // Center map on selected marker
            this.map.setView([markerData.node.latitude, markerData.node.longitude], this.map.getZoom());

            // Open popup
            markerData.marker.openPopup();

            // Highlight on timeline
            this.highlightTimelineStep(stopIndex);

            console.log(`View: Stop ${stopIndex} highlighted`);
        }
    }

    /**
     * Highlight the corresponding step in the timeline
     * @param {number} stopIndex - Index of the stop
     */
    highlightTimelineStep(stopIndex) {
        // Remove previous highlights
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('step-selected');
        });

        // Add highlight to selected step
        const steps = document.querySelectorAll('.step');
        if (steps[stopIndex]) {
            steps[stopIndex].classList.add('step-selected');
            // Scroll into view
            steps[stopIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    // Existing methods
    addPickupDeliveryPoint(tourPoint, startTime, endTime) {
        this.listPickupDeliveryPoints.push({ tourPoint, startTime, endTime });
    }

    addPickupDeliveryPair(fromTourPoint, toTourPoi  nt) {
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