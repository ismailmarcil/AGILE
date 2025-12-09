/**
 * Main application script for DelivHub
 */

// Initialize system and view
const system = new System();
const view = new View("08:00", "map");

// Handle map loading
async function handleLoadMap() {
    const input = document.getElementById("xmlMapInput");

    // Activer le curseur de chargement
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    try {
        const result = await system.loadPlan(input);

        if (!result.success) {
            alert("Erreur lors du chargement: " + result.error);
            return;
        }

        // Hide placeholder and initialize map if first time
        const placeholder = document.getElementById("mapPlaceholder");
        if (placeholder) {
            placeholder.style.display = "none";
        }

        // Display the plan
        view.displayPlan(result.plan);
        console.log("Plan chargé avec succès!");

        // Enable deliveries upload button
        const deliveriesBox = document.getElementById("deliveriesUploadBox");
        if (deliveriesBox) {
            deliveriesBox.style.opacity = "1";
            deliveriesBox.style.pointerEvents = "auto";
        }
    } finally {
        // Restaurer le curseur normal
        document.body.style.cursor = 'default';
        document.body.classList.remove('loading');
    }
}

// Handle tour loading
async function handleLoadTour() {
    const input = document.getElementById("jsonTourInput");

    // Activer le curseur de chargement
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    try {
        const result = await system.loadTourFromFile(input);

        if (!result.success) {
            alert("Erreur lors du chargement de la tournée: " + result.error);
            return;
        }

        const tour = result.tour;
        console.log("Tournée chargée:", tour);

        // Gérer le cas où le fichier contient une liste de tournées
        const tours = Array.isArray(tour) ? tour : [tour];

        // Store all tours globally
        window.allCalculatedTours = tours;
        window.currentDisplayedTour = tours[0];

        // Show save button
        const saveTourBtn = document.getElementById('saveTourBtn');
        if (saveTourBtn) {
            saveTourBtn.style.display = 'inline-flex';
        }

        // Populate courier selector
        populateCourierTourSelector(tours);

        // Display the first tour on the map
        if (view.map) {
            view.displayTour(tours[0]);
        }

        // Update timeline with tour details
        updateTimelineFromTour(tours[0]);

        let alertMessage = `✅ ${tours.length} tournée(s) chargée(s) avec succès!\n\n`;
        tours.forEach((t, idx) => {
            const courierName = t.courier ? t.courier.name : `Coursier ${idx + 1}`;
            alertMessage += `${courierName}: ${t.stops.length} arrêts, ${(t.totalDistance / 1000).toFixed(2)} km, ${Math.round(t.totalDuration / 60)} min\n`;
        });
        alert(alertMessage);
    } finally {
        // Restaurer le curseur normal
        document.body.style.cursor = 'default';
        document.body.classList.remove('loading');
    }
}

// Update timeline UI from tour data
function updateTimelineFromTour(tour) {
    const timelineScroll = document.querySelector('.timeline-scroll');
    if (!timelineScroll) return;

    // Clear existing timeline
    timelineScroll.innerHTML = '';

    // Helper function to format time from departure time and elapsed seconds
    function formatTime(departureTime, elapsedSeconds) {
        const [hours, minutes] = departureTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + Math.round(elapsedSeconds / 60);
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    }

    // Track cumulative time
    let cumulativeTime = 0;

    // Shared numbering for pickup/delivery pairs (stable across reorders)
    function getDemandKey(stop) {
        if (!stop) return null;
        const demandId = stop.demand && (stop.demand.id || stop.demand);
        if (demandId) return String(demandId);
        return stop.node && stop.node.id ? `node-${stop.node.id}` : null;
    }

    if (!tour._demandNumberMap) {
        const uniqueKeys = Array.from(
            new Set(
                tour.stops
                    .map(getDemandKey)
                    .filter(Boolean)
            )
        ).sort();
        tour._demandNumberMap = new Map(uniqueKeys.map((k, idx) => [k, idx + 1]));
    }
    const demandNumberMap = tour._demandNumberMap;
    let nextPairNumber = (demandNumberMap.size ? Math.max(...demandNumberMap.values()) : 0) + 1;

    function getPairNumber(stop) {
        const key = getDemandKey(stop);
        if (!key) return null;
        if (!demandNumberMap.has(key)) {
            demandNumberMap.set(key, nextPairNumber++);
        }
        return demandNumberMap.get(key);
    }

    // Link related pickup/delivery tour points so validation can find pairs
    function linkRelatedTourPoints(t) {
        if (!t || !t.stops) return;
        // clear existing links
        t.stops.forEach(tp => { if (tp) delete tp.relatedTourPoint; });

        const pickMap = new Map();
        t.stops.forEach(tp => {
            if (!tp) return;
            // prefer an explicit demand id when present
            const id = tp.demand && (tp.demand.id || tp.demand) ? (tp.demand.id || tp.demand) : (tp.node && tp.node.id);
            if (!id) return;
            if (tp.type === 'PICKUP') pickMap.set(String(id), tp);
        });
        t.stops.forEach(tp => {
            if (!tp) return;
            const id = tp.demand && (tp.demand.id || tp.demand) ? (tp.demand.id || tp.demand) : (tp.node && tp.node.id);
            if (!id) return;
            if (tp.type === 'DELIVERY' && pickMap.has(String(id))) {
                const p = pickMap.get(String(id));
                p.relatedTourPoint = tp;
                tp.relatedTourPoint = p;
            }
        });
    }

    linkRelatedTourPoints(tour);

    // Add each stop to the timeline (with left/right controls)
    tour.stops.forEach((stop, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';
        // index of the stop in the tour.stops array
        stepDiv.dataset.stopIndex = index;

        // Add click event to highlight the stop on the map
        stepDiv.addEventListener('click', () => {
            if (view && view.highlightStop) {
                view.highlightStop(index);
            }
        });

        // Add step icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'step-icon';

        if (stop.type === 'ENTREPOT') {
            iconDiv.style.background = 'var(--secondary-color)';
            iconDiv.style.color = 'white';
            iconDiv.innerHTML = '<i class="fa-solid fa-warehouse"></i>';
        } else if (stop.type === 'PICKUP') {
            iconDiv.style.borderColor = 'var(--accent-pickup)';
            iconDiv.style.color = 'var(--accent-pickup)';
            const pairNum = getPairNumber(stop);
            iconDiv.textContent = pairNum ? `P${pairNum}` : 'P?';
        } else if (stop.type === 'DELIVERY') {
            iconDiv.style.borderColor = 'var(--accent-delivery)';
            iconDiv.style.color = 'var(--accent-delivery)';
            const pairNum = getPairNumber(stop);
            iconDiv.textContent = pairNum ? `D${pairNum}` : 'D?';
        }
        stepDiv.appendChild(iconDiv);

        // Add left/right controls for non-depot stops
        if (stop.type !== 'ENTREPOT') {
            const controls = document.createElement('div');
            controls.className = 'step-controls';

            const leftBtn = document.createElement('button');
            leftBtn.type = 'button';
            leftBtn.textContent = '⇦';
            leftBtn.title = 'Déplacer à gauche';
            leftBtn.className = 'btn btn-sm';

            const rightBtn = document.createElement('button');
            rightBtn.type = 'button';
            rightBtn.textContent = '⇨';
            rightBtn.title = 'Déplacer à droite';
            rightBtn.className = 'btn btn-sm';

            // Disable left if this is immediately after the start depot
            if (index === 1) leftBtn.disabled = true;
            // Disable right if this is immediately before the final depot
            if (index === (tour.stops.length - 2)) rightBtn.disabled = true;

            // Click handlers call tour.movePoint and rebuild timeline/view
            leftBtn.addEventListener('click', () => {
                // compute current index from model (safer than relying on DOM dataset)
                const oldIndex = tour.stops.indexOf(stop);
                const newIndex = oldIndex - 1;
                if (oldIndex === -1) return; // safety
                const res = tour.movePoint(oldIndex, newIndex);
                if (!res.valid) {
                    alert(mapMoveReasonToMessage(res));
                    // restore UI from model
                    updateTimelineFromTour(tour);
                    return;
                }
                // rebuild simple legs if possible
                rebuildTourLegs(tour);
                // refresh UI and map
                updateTimelineFromTour(tour);
                if (view && view.displayTour) view.displayTour(tour);
            });

            rightBtn.addEventListener('click', () => {
                const oldIndex = tour.stops.indexOf(stop);
                const newIndex = oldIndex + 1;
                if (oldIndex === -1) return;
                const res = tour.movePoint(oldIndex, newIndex);
                if (!res.valid) {
                    alert(mapMoveReasonToMessage(res));
                    updateTimelineFromTour(tour);
                    return;
                }
                rebuildTourLegs(tour);
                updateTimelineFromTour(tour);
                if (view && view.displayTour) view.displayTour(tour);
            });

            controls.appendChild(leftBtn);
            controls.appendChild(rightBtn);
            stepDiv.appendChild(controls);
        }

        // Add time
        const timeDiv = document.createElement('div');
        timeDiv.className = 'step-time';
        timeDiv.textContent = formatTime(tour.departureTime, cumulativeTime);
        stepDiv.appendChild(timeDiv);

        // Add description
        const descDiv = document.createElement('div');
        descDiv.className = 'step-desc';
        if (stop.type === 'ENTREPOT') {
            descDiv.textContent = index === 0 ? 'Départ' : 'Arrivée';
        } else {
            // Afficher "Chargement..." pendant la récupération de l'adresse
            const lat = stop.node?.latitude;
            const lon = stop.node?.longitude;

            if (lat && lon) {
                descDiv.textContent = 'Chargement...';

                // Récupérer l'adresse de manière asynchrone
                if (window.geocodingService) {
                    window.geocodingService.getShortAddress(lat, lon)
                        .then(address => {
                            descDiv.textContent = address;
                            descDiv.title = address; // Tooltip avec l'adresse complète
                        })
                        .catch(() => {
                            // En cas d'erreur, afficher les coordonnées
                            descDiv.textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
                        });
                } else {
                    // Fallback si le service n'est pas disponible
                    descDiv.textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
                }
            } else {
                descDiv.textContent = 'Position inconnue';
            }
        }
        stepDiv.appendChild(descDiv);

        timelineScroll.appendChild(stepDiv);

        // Add service duration to cumulative time
        cumulativeTime += stop.serviceDuration;

        // Add travel time from the corresponding leg
        if (index < tour.legs.length) {
            cumulativeTime += tour.legs[index].travelTime;
        }
    });


    // Helper: rebuild simple legs after stops reordering (best-effort)
    function rebuildTourLegs(t) {
        if (typeof Leg === 'undefined' || !t || !t.stops) return;
        t.legs = [];
        for (let i = 0; i < t.stops.length - 1; i++) {
            const from = t.stops[i];
            const to = t.stops[i + 1];
            try {
                const leg = new Leg(from, to, [from.node, to.node], 0, 0);
                t.legs.push(leg);
            } catch (e) {
                // ignore if Leg signature differs
            }
        }
    }

    // Helper: map movePoint reason to a French message
    function mapMoveReasonToMessage(res) {
        const reason = typeof res === 'string' ? res : (res && res.reason ? res.reason : null);
        switch (reason) {
            case 'DEPOT_START':
                return "❌ L'entrepôt de début ne peut pas être déplacé.";
            case 'DEPOT_END_MOVE':
                return "❌ L'entrepôt de fin ne peut pas être déplacé.";
            case 'DEPOT_START_MUST_REMAIN':
                return "❌ L'entrepôt de début doit rester en première position.";
            case 'DEPOT_END_MUST_REMAIN':
                return "❌ L'entrepôt final doit rester en dernière position.";
            case 'PICKUP_AFTER_DELIVERY':
            case 'DELIVERY_BEFORE_PICKUP':
                return "❌ Violations d'ordre: un pickup doit toujours être avant sa livraison.";
            case 'OUT_OF_RANGE':
                return "❌ Indice hors plage.";
            default:
                return "❌ Déplacement interdit.";
        }
    }
}

// Handle demands loading

// Récupération des éléments du DOM
const addDemandSidebar = document.getElementById("addDemandSidebar");
const addDemandForm = document.getElementById("addDemandForm");
const addDemandBtn = document.getElementById("addDemandBtn");
const addDemandCancelBtn = document.getElementById("addDemandCancelBtn");
const addDemandCloseBtn = document.getElementById("addDemandCloseBtn");
const clearDemandsBtn = document.getElementById("clearDemandsBtn");

// État de sélection des points
let nodeSelectionState = {
    mode: null, // 'pickup' ou 'delivery'
    pickupNode: null,
    deliveryNode: null,
    pickupMarker: null,
    deliveryMarker: null
};

function openAddDemandModal() {
    if (!addDemandSidebar) return;

    // Vérifier qu'un plan est chargé
    if (!system.plan) {
        alert('⚠️ Veuillez d\'abord charger un plan XML pour pouvoir ajouter des demandes.');
        return;
    }

    // Réinitialiser l'état
    resetNodeSelection();
    addDemandSidebar.style.display = "flex";
}

function closeAddDemandModal() {
    if (!addDemandSidebar) return;
    addDemandSidebar.style.display = "none";

    // Nettoyer les marqueurs de sélection
    if (nodeSelectionState.pickupMarker) {
        view.map.removeLayer(nodeSelectionState.pickupMarker);
    }
    if (nodeSelectionState.deliveryMarker) {
        view.map.removeLayer(nodeSelectionState.deliveryMarker);
    }

    // Réinitialiser le mode de sélection
    nodeSelectionState.mode = null;
    view.setNodeSelectionMode(false);

    if (addDemandForm) {
        addDemandForm.reset();
        document.getElementById('pickupAddressDisplay').value = '';
        document.getElementById('deliveryAddressDisplay').value = '';
    }

    resetNodeSelection();
}

function resetNodeSelection() {
    nodeSelectionState = {
        mode: null,
        pickupNode: null,
        deliveryNode: null,
        pickupMarker: null,
        deliveryMarker: null
    };

    // Réinitialiser les champs
    const pickupInput = document.getElementById('pickupAddressInput');
    const deliveryInput = document.getElementById('deliveryAddressInput');
    const pickupDisplay = document.getElementById('pickupAddressDisplay');
    const deliveryDisplay = document.getElementById('deliveryAddressDisplay');

    if (pickupInput) pickupInput.value = '';
    if (deliveryInput) deliveryInput.value = '';
    if (pickupDisplay) pickupDisplay.value = '';
    if (deliveryDisplay) deliveryDisplay.value = '';

    // Réinitialiser les styles des boutons
    const selectPickupBtn = document.getElementById('selectPickupBtn');
    const selectDeliveryBtn = document.getElementById('selectDeliveryBtn');

    if (selectPickupBtn) {
        selectPickupBtn.style.background = '';
        selectPickupBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
    }
    if (selectDeliveryBtn) {
        selectDeliveryBtn.style.background = '';
        selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
    }
}

// Fonction appelée quand un nœud est sélectionné sur la carte
window.onNodeSelected = function(node) {
    if (!nodeSelectionState.mode) return;

    if (nodeSelectionState.mode === 'pickup') {
        nodeSelectionState.pickupNode = node;

        // Mettre à jour les champs
        document.getElementById('pickupAddressInput').value = node.id;
        document.getElementById('pickupAddressDisplay').value = `Point ${node.id} (${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)})`;

        // Mettre à jour le bouton
        const btn = document.getElementById('selectPickupBtn');
        btn.style.background = '#4caf50';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Point sélectionné';

        // Ajouter un marqueur vert sur la carte
        if (nodeSelectionState.pickupMarker) {
            view.map.removeLayer(nodeSelectionState.pickupMarker);
        }

        nodeSelectionState.pickupMarker = L.circleMarker([node.latitude, node.longitude], {
            radius: 12,
            fillColor: '#4caf50',
            color: '#fff',
            weight: 3,
            fillOpacity: 0.8
        }).addTo(view.map);

        nodeSelectionState.pickupMarker.bindPopup(`<b>Point d'enlèvement</b><br>ID: ${node.id}`).openPopup();

    } else if (nodeSelectionState.mode === 'delivery') {
        nodeSelectionState.deliveryNode = node;

        // Mettre à jour les champs
        document.getElementById('deliveryAddressInput').value = node.id;
        document.getElementById('deliveryAddressDisplay').value = `Point ${node.id} (${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)})`;

        // Mettre à jour le bouton
        const btn = document.getElementById('selectDeliveryBtn');
        btn.style.background = '#2196f3';
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Point sélectionné';

        // Ajouter un marqueur bleu sur la carte
        if (nodeSelectionState.deliveryMarker) {
            view.map.removeLayer(nodeSelectionState.deliveryMarker);
        }

        nodeSelectionState.deliveryMarker = L.circleMarker([node.latitude, node.longitude], {
            radius: 12,
            fillColor: '#2196f3',
            color: '#fff',
            weight: 3,
            fillOpacity: 0.8
        }).addTo(view.map);

        nodeSelectionState.deliveryMarker.bindPopup(`<b>Point de livraison</b><br>ID: ${node.id}`).openPopup();
    }

    // Désactiver le mode de sélection
    nodeSelectionState.mode = null;
    view.setNodeSelectionMode(false);
};

// Ouverture via le bouton +
if (addDemandBtn) {
    addDemandBtn.addEventListener("click", openAddDemandModal);
}

// Boutons de sélection sur la carte
document.addEventListener('DOMContentLoaded', () => {
    const selectPickupBtn = document.getElementById('selectPickupBtn');
    const selectDeliveryBtn = document.getElementById('selectDeliveryBtn');

    if (selectPickupBtn) {
        selectPickupBtn.addEventListener('click', () => {
            nodeSelectionState.mode = 'pickup';
            view.setNodeSelectionMode(true, 'pickup');

            // Mettre en surbrillance le bouton actif
            selectPickupBtn.style.background = '#ffa726';
            selectPickupBtn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Cliquez sur la carte...';

            selectDeliveryBtn.style.background = '';
            selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
        });
    }

    if (selectDeliveryBtn) {
        selectDeliveryBtn.addEventListener('click', () => {
            nodeSelectionState.mode = 'delivery';
            view.setNodeSelectionMode(true, 'delivery');

            // Mettre en surbrillance le bouton actif
            selectDeliveryBtn.style.background = '#ffa726';
            selectDeliveryBtn.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> Cliquez sur la carte...';

            selectPickupBtn.style.background = '';
            selectPickupBtn.innerHTML = '<i class="fa-solid fa-map-marker-alt"></i> Sélectionner sur la carte';
        });
    }
});

// Effacer toutes les demandes via le bouton Clear
if (clearDemandsBtn) {
    clearDemandsBtn.addEventListener("click", () => {
        if (system.demandsList.length === 0) {
            alert("Aucune demande à effacer.");
            return;
        }

        if (confirm(`Êtes-vous sûr de vouloir effacer toutes les ${system.demandsList.length} demandes ?`)) {
            system.demandsList = [];
            system.toursList = [];
            
            updateDemandsUI();
            console.log("Toutes les demandes ont été effacées");
        }
    });
}

// Fermeture via bouton "Annuler" + croix
if (addDemandCancelBtn) {
    addDemandCancelBtn.addEventListener("click", closeAddDemandModal);
}
if (addDemandCloseBtn) {
    addDemandCloseBtn.addEventListener("click", closeAddDemandModal);
}

// La sidebar ne se ferme que via les boutons Annuler ou X (pas de clic sur overlay)

// Soumission du formulaire
if (addDemandForm) {
    addDemandForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const pickupAddressInput = document.getElementById("pickupAddressInput");
        const deliveryAddressInput = document.getElementById("deliveryAddressInput");
        const pickupDurationInput = document.getElementById("pickupDurationInput");
        const deliveryDurationInput = document.getElementById("deliveryDurationInput");

        const pickupAddress = pickupAddressInput.value.trim();
        const deliveryAddress = deliveryAddressInput.value.trim();

        const pickupDuration = Number(pickupDurationInput.value);
        const deliveryDuration = Number(deliveryDurationInput.value);

        // Validation améliorée avec messages spécifiques
        if (!pickupAddress) {
            alert("⚠️ Veuillez sélectionner un point d'enlèvement sur la carte.");
            return;
        }

        if (!deliveryAddress) {
            alert("⚠️ Veuillez sélectionner un point de livraison sur la carte.");
            return;
        }

        if (pickupAddress === deliveryAddress) {
            alert("⚠️ Le point d'enlèvement et le point de livraison doivent être différents.");
            return;
        }

        if (isNaN(pickupDuration) || pickupDuration < 0) {
            alert("⚠️ La durée d'enlèvement doit être un nombre positif.");
            return;
        }

        if (isNaN(deliveryDuration) || deliveryDuration < 0) {
            alert("⚠️ La durée de livraison doit être un nombre positif.");
            return;
        }

        // Appel de la fonction back déjà existante dans System
        let result;
        try {
            result = system.addDemand(
                pickupAddress,
                deliveryAddress,
                pickupDuration,
                deliveryDuration
            );
        } catch (err) {
            console.error('addDemand threw:', err);
            alert('❌ Erreur lors de l\'ajout de la demande: ' + (err && err.message ? err.message : String(err)));
            return;
        }

        if (!result) {
            alert('❌ Erreur inconnue lors de l\'ajout de la demande.');
            return;
        }

        if (!result.success) {
            alert("❌ " + (result.error || 'Erreur inconnue lors de l\'ajout de la demande.'));
            return;
        }

        const demand = result.demand;
        // Assign a default name for manually added demands
        if (demand) {
            demand.clientName = `Demande manuelle #${demand.id}`;
        }

        // Message de succès avec les détails
        console.log('✅ Demande ajoutée avec succès:', demand);
        alert(`✅ Demande ajoutée avec succès!\n\nEnlèvement: Point ${pickupAddress}\nLivraison: Point ${deliveryAddress}\nDurées: ${pickupDuration}s / ${deliveryDuration}s`);

        // Rafraîchir l'UI avec la nouvelle demande
        updateDemandsUI();

        // Fermer la modale
        closeAddDemandModal();
    });
}

async function handleLoadDemands() {
    const input = document.getElementById("xmlDeliveriesInput");

    // Process multiple files
    if (input.files.length === 0) {
        return;
    }

    // Activer le curseur de chargement
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    try {
        let totalDemandsLoaded = 0;
        const fileNames = [];

        // Process each selected file
        for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const fileName = file.name.replace(/\.xml$/i, '');
        fileNames.push(fileName);

        // Create a temporary input for this file
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        tempInput.files = dataTransfer.files;

        // Track the number of demands before loading
        const demandsCountBefore = system.demandsList.length;

        const result = await system.loadDemandsFromXML(tempInput);

        if (!result.success) {
            alert(`Erreur lors du chargement de ${fileName}: ${result.error}`);
            continue;
        }

        // Update client names for the newly added demands
        for (let j = demandsCountBefore; j < system.demandsList.length; j++) {
            system.demandsList[j].clientName = fileName;
        }

        totalDemandsLoaded += result.count;
        console.log(`${result.count} demandes chargées depuis ${fileName}`);
    }

        // Update UI with loaded demands
        updateDemandsUI();

        if (totalDemandsLoaded > 0) {
            // Clear input files for next load
            input.value = '';
            alert(`${totalDemandsLoaded} demandes chargées avec succès depuis ${input.files.length} fichier(s)!\nFichiers: ${fileNames.join(', ')}`);
        }
    } catch (error) {
        console.error('Error loading demands:', error);
        alert('Erreur lors du chargement des demandes: ' + error.message);
    } finally {
        // Restaurer le curseur normal
        document.body.style.cursor = 'default';
        document.body.classList.remove('loading');
    }
}

// Helper function to format node address for display
function formatNodeAddress(nodeIdOrObject) {
    if (!system.plan) {
        return `Node #${nodeIdOrObject}`;
    }

    // Si c'est déjà un objet Node avec latitude/longitude
    if (nodeIdOrObject && typeof nodeIdOrObject === 'object' && nodeIdOrObject.latitude && nodeIdOrObject.longitude) {
        const lat = nodeIdOrObject.latitude.toFixed(4);
        const lon = nodeIdOrObject.longitude.toFixed(4);
        return `(${lat}, ${lon})`;
    }

    // Sinon, c'est un ID (string ou number)
    let nodeId = nodeIdOrObject;

    // Si l'ID est une string, extraire uniquement le nombre
    if (typeof nodeId === 'string') {
        // Enlever "Node " au début si présent
        nodeId = nodeId.replace(/^Node\s*/i, '').trim();
    }

    const node = system.plan.getNodeById(nodeId);
    if (!node) {
        return `Node #${nodeId} (non trouvé)`;
    }

    // Format coordinates with 4 decimal places
    const lat = node.latitude.toFixed(4);
    const lon = node.longitude.toFixed(4);
    return `(${lat}, ${lon})`;
}

// Update the demands list in the UI
function updateDemandsUI() {
    // Find the container where demands are displayed
    const demandsContainer = document.getElementById('demandsContainer');

    // Remove all existing cards and messages (keep only the title)
    const children = Array.from(demandsContainer.children);
    children.forEach(child => {
        if (!child.classList.contains('section-title')) {
            child.remove();
        }
    });

    // Update map display if plan is loaded
    if (system.plan && view.map && system.toursList.length === 0) {
        // Redisplay plan (light segments and nodes)
        const planJSON = system.plan.toJSON();
        view.clearMap();
        view.displaySegments(planJSON.segments);
        view.displayNodes(planJSON.nodes);

        // Display demands on top
        view.displayDemands(system.demandsList, system.plan);
    }

    // Add each demand from system.demandsList
    system.demandsList.forEach((demand) => {
        const demandCard = document.createElement('div');
        demandCard.className = 'demand-card';

        // Convert durations from seconds to minutes for display
        const pickupMinutes = Math.round(demand.pickupDuration / 60);
        const deliveryMinutes = Math.round(demand.deliveryDuration / 60);

        // Get formatted addresses from the plan
        const pickupLocation = formatNodeAddress(demand.pickupAddress);
        const deliveryLocation = formatNodeAddress(demand.deliveryAddress);

        demandCard.innerHTML = `
            <div class="demand-header">
                <span style="font-weight:600; font-size:0.9rem;">${demand.clientName || 'Client #' + demand.id}</span>
                <div class="demand-actions">
                    <button class="btn-icon" title="Modifier la demande" onclick="editDemand(${demand.id})">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-icon delete" title="Supprimer la demande" onclick="deleteDemand(${demand.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="point-row">
                <div class="dot dot-p"></div>
                <span style="font-size: 0.8rem;">Enlèvement: ${pickupLocation} (${pickupMinutes}min)</span>
            </div>
            <div class="point-row">
                <div class="dot dot-d"></div>
                <span style="font-size: 0.8rem;">Livraison: ${deliveryLocation} (${deliveryMinutes}min)</span>
            </div>
        `;

        demandsContainer.appendChild(demandCard);
    });

    // If no demands, show a message
    if (system.demandsList.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.style.cssText = 'text-align: center; color: #95a5a6; font-size: 0.85rem; padding: 20px;';
        emptyMessage.textContent = 'Aucune demande chargée. Chargez un fichier XML de livraisons.';
        demandsContainer.appendChild(emptyMessage);
    }
}

// Edit demand function (placeholder)
function editDemand(demandId) {
    console.log('Edit demand:', demandId);
    alert('Fonctionnalité de modification à implémenter');
}

// Delete demand function
function deleteDemand(demandId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
        const removed = system.removeDemandById(demandId);
        if (removed) {
            updateDemandsUI();
            console.log('Demande supprimée:', demandId);
        }
    }
}

// Sauvegarde de la tournée
async function saveTour() {
    // Vérifie qu'il y a des tournées à sauvegarder
    const toursToSave = window.allCalculatedTours || (window.currentDisplayedTour ? [window.currentDisplayedTour] : null);

    if (!toursToSave || toursToSave.length === 0) {
        alert('Aucune tournée à sauvegarder. Calculez ou chargez une tournée d\'abord.');
        return;
    }

    const saveTourBtn = document.getElementById('saveTourBtn');
    const originalText = saveTourBtn.innerHTML;
    saveTourBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Sauvegarde...';
    saveTourBtn.disabled = true;

    try {
        // Si plusieurs tournées, sauvegarder toutes
        if (toursToSave.length > 1) {
            let savedCount = 0;
            for (const tour of toursToSave) {
                const result = await system.saveTourToServer(tour);
                if (result.success) {
                    savedCount++;
                    tour._savedTourId = result.tourId;
                }
            }
            alert(`✅ ${savedCount} tournée(s) sauvegardée(s) avec succès!`);
            console.log(`${savedCount} tournées sauvegardées`);
        } else {
            // Une seule tournée
            const result = await system.saveTourToServer(toursToSave[0]);

            if (result.success) {
                alert(result.message);
                console.log('Tournée sauvegardée:', result.tourId);
                toursToSave[0]._savedTourId = result.tourId;
            } else {
                alert('Erreur lors de la sauvegarde: ' + result.error);
            }
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
        console.error('Save error:', error);
    } finally {
        saveTourBtn.innerHTML = originalText;
        saveTourBtn.disabled = false;
    }
}

// Fetch list of couriers from server and populate select
async function fetchCouriers() {
    try {
        const resp = await fetch('/api/couriers');
        const data = await resp.json();
        if (!data.success) return;

        const select = document.getElementById('couriersSelect');
        if (!select) return;

        // Clear options
        select.innerHTML = '';

        const couriers = data.couriers || [];
        system.listCouriers = [];

        if (couriers.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Aucun coursier';
            select.appendChild(opt);
            return;
        }

        couriers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.id})`;
            select.appendChild(opt);
            // Add to system list
            try { system.listCouriers.push(new Courier(c.id, c.name)); } catch (e) { system.listCouriers.push(c); }
        });
    } catch (error) {
        console.error('Erreur fetchCouriers:', error);
    }
}

// Create a new courier via server API
async function createCourier() {
    const input = document.getElementById('courierNameInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) { alert('Entrez un nom pour le coursier'); return; }

    const btn = document.getElementById('createCourierBtn');
    const orig = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '...'; }

    try {
        const resp = await fetch('/api/couriers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await resp.json();
        if (data.success) {
            input.value = '';
            await fetchCouriers();
            // select the newly created courier
            const sel = document.getElementById('couriersSelect');
            if (sel && data.courier && data.courier.id) {
                sel.value = data.courier.id;
            }
            alert('Coursier créé: ' + data.courier.name);
        } else {
            alert('Erreur: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('createCourier error:', error);
        alert('Erreur lors de la création du coursier');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

// Courier count widget helpers
function setCourierCountDisplay(count) {
    const input = document.getElementById('courierCountInput');
    if (!input) return;
    input.value = String(count);
}

function changeCourierCount(delta) {
    const input = document.getElementById('courierCountInput');
    if (!input) return;
    const old = Number(input.value) || 1;
    let next = old + delta;
    if (next < 1) next = 1;
    if (next > 99) next = 99;
    setCourierCountDisplay(next);
    // Keep system in sync
    if (typeof system !== 'undefined') {
        system.nbCouriers = next;
    }
}

// Handle tour calculation
async function handleCalculateTour() {
    // Vérifier que le plan est chargé
    if (!system.plan) {
        alert('⚠️ Veuillez d\'abord charger un plan XML.');
        return;
    }

    // Vérifier qu'il y a des demandes
    if (!system.demandsList || system.demandsList.length === 0) {
        alert('⚠️ Veuillez d\'abord charger ou ajouter des demandes.');
        return;
    }

    // Récupérer le bouton pour afficher l'état
    const calculateBtn = document.querySelector('.sidebar .btn.btn-primary');
    const originalText = calculateBtn.innerHTML;
    calculateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calcul en cours...';
    calculateBtn.disabled = true;

    // Activer le curseur de chargement sur toute la page
    document.body.style.cursor = 'wait';
    document.body.classList.add('loading');

    // Utiliser setTimeout pour permettre au navigateur de mettre à jour l'interface
    // avant de lancer le calcul synchrone qui bloque l'UI
    setTimeout(() => {
        try {
            // Ensure there's at least one courier in system (some flows add couriers when loading XML)
            if (!system.listCouriers || system.listCouriers.length === 0) {
                try {
                    // Respect system's Courier class signature
                    const defaultCourier = new Courier(1, 'Default');
                    system.listCouriers = [defaultCourier];
                    console.log('Ajout d\'un coursier par défaut pour le calcul:', defaultCourier);
                } catch (e) {
                    // Fallback plain object
                    system.listCouriers = [{ id: 1, name: 'Default' }];
                    console.warn('Impossible d\'instancier Courier, fallback au plain object', e);
                }
            }

            // Vérifier que l'entrepôt est défini (sinon system.calculateTour retournera null)
            if (!system.plan.warehouse) {
                alert('⚠️ Aucun entrepôt défini dans le plan. Chargez un fichier de demandes (XML) qui contient la balise <entrepot> ou définissez l\'entrepôt dans le plan.');
                return;
            }

            // Appeler la fonction de calcul de tournée du système
            const result = system.calculateTour(system.demandsList);

            if (!result) {
                alert('❌ Erreur lors du calcul de la tournée. Vérifiez que toutes les demandes sont valides.');
                return;
            }

            // Gérer le cas où calculateTour retourne une liste de tournées
            const tours = Array.isArray(result) ? result : [result];

            if (tours.length === 0) {
                alert('❌ Aucune tournée n\'a pu être calculée.');
                return;
            }

            console.log('Tournées calculées:', tours);

            // Store all tours globally
            window.allCalculatedTours = tours;
            window.currentDisplayedTour = tours[0]; // Afficher la première par défaut

            // Show save button
            const saveTourBtn = document.getElementById('saveTourBtn');
            if (saveTourBtn) {
                saveTourBtn.style.display = 'inline-flex';
            }

            // Populate courier selector
            populateCourierTourSelector(tours);

            // Pré-charger toutes les adresses pour améliorer les performances
            if (window.geocodingService) {
                const allCoordinates = [];
                tours.forEach(tour => {
                    tour.stops.forEach(stop => {
                        if (stop.node && stop.node.latitude && stop.node.longitude) {
                            allCoordinates.push({
                                latitude: stop.node.latitude,
                                longitude: stop.node.longitude
                            });
                        }
                    });
                });

                // Pré-chargement asynchrone (ne bloque pas l'affichage)
                window.geocodingService.preloadAddresses(allCoordinates)
                    .then(() => console.log('✅ Adresses préchargées'))
                    .catch(err => console.warn('⚠️ Erreur préchargement adresses:', err));
            }

            // Display the first tour on the map
            if (view.map) {
                view.displayTour(tours[0]);
            }

            // Update timeline with tour details
            updateTimelineFromTour(tours[0]);

            // Afficher un message de succès
            let successMessage = `✅ ${tours.length} tournée(s) calculée(s) avec succès!\n\n`;
            tours.forEach((tour, index) => {
                const distanceKm = (tour.totalDistance / 1000).toFixed(2);
                const durationMin = Math.round(tour.totalDuration / 60);
                const courierName = tour.courier ? tour.courier.name : `Coursier ${index + 1}`;
                successMessage += `${courierName}: ${tour.stops.length} arrêts, ${distanceKm} km, ${durationMin} min\n`;
            });
            alert(successMessage);

        } catch (error) {
            console.error('Erreur lors du calcul de la tournée:', error);
            alert('❌ Erreur lors du calcul de la tournée: ' + error.message);
        } finally {
            // Restaurer le curseur normal
            document.body.style.cursor = 'default';
            document.body.classList.remove('loading');

            calculateBtn.innerHTML = originalText;
            calculateBtn.disabled = false;
        }
    }, 50); // 50ms de délai pour permettre la mise à jour de l'interface
}

// Populate courier tour selector with all calculated tours
function populateCourierTourSelector(tours) {
    const container = document.getElementById('courierSelectContainer');
    const select = document.getElementById('courierTourSelect');

    if (!container || !select) return;

    // Clear existing options
    select.innerHTML = '<option value="">Sélectionner une tournée...</option>';

    if (!tours || tours.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Add option for each tour
    tours.forEach((tour, index) => {
        const option = document.createElement('option');
        option.value = index;
        const courierName = tour.courier ? tour.courier.name : `Coursier ${index + 1}`;
        const distanceKm = (tour.totalDistance / 1000).toFixed(2);
        const durationMin = Math.round(tour.totalDuration / 60);
        option.textContent = `${courierName} - ${tour.stops.length} arrêts (${distanceKm} km, ${durationMin} min)`;
        select.appendChild(option);
    });

    // Select first tour by default
    select.value = '0';

    // Show the container
    container.style.display = 'block';

    // Add change event listener
    select.onchange = function() {
        const selectedIndex = parseInt(this.value);
        if (!isNaN(selectedIndex) && window.allCalculatedTours && window.allCalculatedTours[selectedIndex]) {
            const selectedTour = window.allCalculatedTours[selectedIndex];
            window.currentDisplayedTour = selectedTour;

            // Display the selected tour
            if (view.map) {
                view.displayTour(selectedTour);
            }

            // Update timeline
            updateTimelineFromTour(selectedTour);

            console.log('Tournée sélectionnée:', selectedTour);
        }
    };
}

// Helper function to get the number of couriers
// TODO: Cette fonction sera utilisée lors du calcul des tournées multiples
// Exemple: const tours = system.calculateTours(system.demandsList, getCouriersCount());
function getCouriersCount() {
    const couriersCountInput = document.getElementById('couriersCount');
    return parseInt(couriersCountInput?.value) || 1;
}

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const saveTourBtn = document.getElementById('saveTourBtn');
    if (saveTourBtn) {
        saveTourBtn.addEventListener('click', saveTour);
    }

    // Wire courier creation UI
    const createCourierBtn = document.getElementById('createCourierBtn');
    if (createCourierBtn) createCourierBtn.addEventListener('click', createCourier);
    // Fetch existing couriers to populate select
    fetchCouriers();

    // Wire the courier count +/- widget
    const plus = document.getElementById('courierPlusBtn');
    const minus = document.getElementById('courierMinusBtn');
    const countInput = document.getElementById('courierCountInput');

    // Initialize display from system if available
    if (countInput) {
        const init = (typeof system !== 'undefined' && system.nbCouriers) ? system.nbCouriers : 1;
        setCourierCountDisplay(init);
        if (typeof system !== 'undefined') system.nbCouriers = init;
    }

    if (plus) plus.addEventListener('click', () => changeCourierCount(1));
    if (minus) minus.addEventListener('click', () => changeCourierCount(-1));

    // Ajouter le listener pour le bouton de calcul de tournée
    const calculateBtn = document.querySelector('.sidebar .btn.btn-primary');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', handleCalculateTour);
    }

    // Gestion du nombre de coursiers
    const couriersCountInput = document.getElementById('couriersCount');
    const decreaseCouriersBtn = document.getElementById('decreaseCouriersBtn');
    const increaseCouriersBtn = document.getElementById('increaseCouriersBtn');

    if (decreaseCouriersBtn && couriersCountInput) {
        decreaseCouriersBtn.addEventListener('click', () => {
            let count = parseInt(couriersCountInput.value) || 1;
            if (count > 1) {
                count--;
                couriersCountInput.value = count;
                console.log('Nombre de coursiers:', count);
            }
        });
    }

    if (increaseCouriersBtn && couriersCountInput) {
        increaseCouriersBtn.addEventListener('click', () => {
            let count = parseInt(couriersCountInput.value) || 1;
            if (count < 10) { // Limite maximale de 10 coursiers
                count++;
                couriersCountInput.value = count;
                console.log('Nombre de coursiers:', count);
            }
        });
    }

});
