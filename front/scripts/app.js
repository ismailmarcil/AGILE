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

// Handle demands loading
async function handleLoadDemands() {
    const input = document.getElementById("xmlDeliveriesInput");

    // Extract filename without extension
    let fileName = "Client";
    if (input.files.length > 0) {
        const fullName = input.files[0].name;
        // Remove .xml extension
        fileName = fullName.replace(/\.xml$/i, '');
    }

    const result = await system.loadDemandsFromXML(input);

    if (!result.success) {
        alert("Erreur lors du chargement des demandes: " + result.error);
        return;
    }

    // Update client names based on filename
    system.demandsList.forEach((demand, index) => {
        demand.clientName = `${fileName} #${index + 1}`;
    });

    console.log(`${result.count} demandes chargées avec succès!`);
    console.log("Entrepôt:", result.warehouse);
    console.log("Demandes:", result.demands);

    // Update UI with loaded demands
    updateDemandsUI();

    alert(`${result.count} demandes chargées avec succès!\nEntrepôt: ${result.warehouse.address}\nHeure départ: ${result.warehouse.departureTime}`);
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

