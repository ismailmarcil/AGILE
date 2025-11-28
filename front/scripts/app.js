/**
 * Main application script for DelivHub
 */

// Initialize system and view
const system = new System();
const view = new View("08:00", "map");

// Handle map loading
async function handleLoadMap() {
    const input = document.getElementById("xmlMapInput");
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
}

// Handle tour loading
async function handleLoadTour() {
    const input = document.getElementById("jsonTourInput");
    const result = await system.loadTourFromFile(input);

    if (!result.success) {
        alert("Erreur lors du chargement de la tournée: " + result.error);
        return;
    }

    const tour = result.tour;
    console.log("Tournée chargée:", tour);

    // Display the tour on the map
    if (view.map) {
        view.displayTour(tour);
    }

    // Update timeline with tour details
    updateTimelineFromTour(tour);

    alert(`Tournée ${tour.id} chargée avec succès!\nCoursier: ${tour.courier ? tour.courier.name : 'Non assigné'}\nDépart: ${tour.departureTime}\nArrêts: ${tour.stops.length}\nDistance: ${(tour.totalDistance / 1000).toFixed(2)} km\nDurée: ${Math.round(tour.totalDuration / 60)} min`);
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

    // Counters for pickup and delivery numbering
    let pickupCounter = 1;
    let deliveryCounter = 1;

    // Add each stop to the timeline
    tour.stops.forEach((stop, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step';

        // Add drag handle for non-warehouse stops
        const dragHandleDiv = document.createElement('div');
        dragHandleDiv.className = 'drag-handle';
        if (stop.type !== 'ENTREPOT') {
            dragHandleDiv.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
        }
        stepDiv.appendChild(dragHandleDiv);

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
            iconDiv.textContent = `P${pickupCounter}`;
            pickupCounter++;
        } else if (stop.type === 'DELIVERY') {
            iconDiv.style.borderColor = 'var(--accent-delivery)';
            iconDiv.style.color = 'var(--accent-delivery)';
            iconDiv.textContent = `D${deliveryCounter}`;
            deliveryCounter++;
        }
        stepDiv.appendChild(iconDiv);

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
            // Try to get a short address description
            const lat = stop.node?.latitude?.toFixed(3) || '?';
            const lon = stop.node?.longitude?.toFixed(3) || '?';
            descDiv.textContent = `${lat}, ${lon}`;
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

    // Réinitialiser le drag & drop après avoir reconstruit la timeline
    if (window.timelineDragDrop) {
        window.timelineDragDrop.refresh();
    }
}

// Handle demands loading

// Récupération des éléments du DOM
const addDemandModal = document.getElementById("addDemandModal");
const addDemandForm = document.getElementById("addDemandForm");
const addDemandBtn = document.getElementById("addDemandBtn");
const addDemandCancelBtn = document.getElementById("addDemandCancelBtn");
const addDemandCloseBtn = document.getElementById("addDemandCloseBtn");
const clearDemandsBtn = document.getElementById("clearDemandsBtn");



function openAddDemandModal() {
    if (!addDemandModal) return;
    addDemandModal.style.display = "flex";
}

function closeAddDemandModal() {
    if (!addDemandModal) return;
    addDemandModal.style.display = "none";
    if (addDemandForm) {
        addDemandForm.reset();
    }
}

// Ouverture via le bouton +
if (addDemandBtn) {
    addDemandBtn.addEventListener("click", openAddDemandModal);
}

// Effacer toutes les demandes via le bouton Clear
if (clearDemandsBtn) {
    clearDemandsBtn.addEventListener("click", () => {
        if (system.demandsList.length === 0) {
            alert("Aucune demande à effacer.");
            return;
        }

        if (confirm(`Êtes-vous sûr de vouloir effacer toutes les ${system.demandsList.length} demandes ?`)) {
            system.demandsList = [];
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

// Fermeture si on clique sur le fond gris
if (addDemandModal) {
    addDemandModal.addEventListener("click", (e) => {
        if (e.target === addDemandModal) {
            closeAddDemandModal();
        }
    });
}

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

        if (!pickupAddress || !deliveryAddress || isNaN(pickupDuration) || isNaN(deliveryDuration)) {
            alert("Merci de remplir tous les champs correctement.");
            return;
        }



        // Appel de la fonction back déjà existante dans System
        // addDemand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration)
        const demand = system.addDemand(
            pickupAddress,
            deliveryAddress,
            pickupDuration,
            deliveryDuration
        );

        // Assign a default name for manually added demands
        if (demand) {
            demand.clientName = `Demande manuelle #${demand.id}`;
        }

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
        alert(`${totalDemandsLoaded} demandes chargées avec succès depuis ${input.files.length} fichier(s)!\nFichiers: ${fileNames.join(', ')}`);
    }
}

// Helper function to format node address for display
function formatNodeAddress(nodeId) {
    if (!system.plan) {
        return `Node #${nodeId}`;
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
    if (system.plan && view.map) {
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

