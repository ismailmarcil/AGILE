// Demand is expected to be loaded before this script in browser environment
// For Node.js environment - import Demand and Tour

if (typeof require !== 'undefined') {
    // Node.js environment
    Demand = require("./demand");
    Tour = require("./tours");
}
// In browser, Demand and Tour will be available from the global scope after their scripts load

class System {
    plan;

    constructor(nbCouriers) {
        this.nbCouriers = nbCouriers;
        this.listCouriers = [];
        this.demandsList = [];
        this.toursList = [];
        this.nextDemandId = 1; //paramètre pour gérer les id des demandes ajoutées.
     }

    async loadPlan(fileInput) {

        // 1. Vérifier qu'un fichier est sélectionné
        if (fileInput.files.length === 0) {
                 return { success: false, error: " Aucun fichier sélectionné. Veuillez choisir un fichier XML."};
        }

        const file = fileInput.files[0];

        // 2. Vérifier l'extension et le type MIME
        const fileName = file.name.toLowerCase();
        const isXmlExtension = fileName.endsWith(".xml");
        const isXmlMime = file.type === "text/xml" || file.type === "application/xml" || file.type === "";

        if (!isXmlExtension && !isXmlMime) {
            return { success: false, error: "Le fichier sélectionné n'est pas un fichier XML."};
        }

        // 3. Lire le contenu du fichier
        let text;
        try {
            text = await file.text();
        } catch (error) {
            return { success: false, error: "Impossible de lire le fichier. Vérifiez qu'il n'est pas corrompu."};

        }

        // 4. Parser le XML
        const xmlDoc = new DOMParser().parseFromString(text, "application/xml");

        // Vérifier les erreurs de parsing
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            return { success: false, error: "Le contenu du fichier XML est invalide ou mal formé."};
        }

        const reseau = xmlDoc.getElementsByTagName("reseau")[0];
        const noeuds = xmlDoc.getElementsByTagName("noeud");
        const troncons = xmlDoc.getElementsByTagName("troncon");

        if (!reseau) {
            return { success: false, error: "Le XML ne contient pas la balise <reseau>. Ce n'est pas un plan valide."};
        }

        if (noeuds.length === 0) {
            return { success: false, error: "Aucun noeud trouvé dans le XML. Ce fichier ne correspond pas à un plan."};
        }

        if (troncons.length === 0) {
            return { success: false, error: "Aucun troncon trouvé dans le XML. Ce fichier ne correspond pas à un plan."};
        }

        // Validación de atributos esenciales
        let estructuraValida = true;

        for (let n of noeuds) {
            if (!n.getAttribute("id") || !n.getAttribute("latitude") || !n.getAttribute("longitude")) {
                estructuraValida = false;
                console.log(n);
                break;
            }
        }

        for (let t of troncons) {
            if (!t.getAttribute("origine") || !t.getAttribute("destination") || !t.getAttribute("longueur")) {
                estructuraValida = false;
                console.log(t);
                break;
            }
        }

        if (!estructuraValida) {
            return { success: false, error: "Le XML n'a pas la structure d'un plan de carte (noeud/ troncon incorrects)."};
       }

    const nodes = Array.from(noeuds).map(n => new Node(
        n.getAttribute("id"),
        parseFloat(n.getAttribute("latitude")),
        parseFloat(n.getAttribute("longitude")),
        []
    ));

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Initialize distance matrix
    this.distanceMatrix = new Map();

    const segments = Array.from(troncons).map(t => {
        const originId = t.getAttribute("origine");
        const destId = t.getAttribute("destination");
        const name = t.getAttribute("nomRue") || "";
        const length = parseFloat(t.getAttribute("longueur"));

        const originNode = nodeMap.get(originId) || null;
        const destinationNode = nodeMap.get(destId) || null;

        const seg = new Segment(
            originNode,
            destinationNode,
            name,
            length
        );

        if (originNode) {
            originNode.segments.push(seg);
            
            // Add to distance matrix
            if (!this.distanceMatrix.has(originNode.id)) {
                this.distanceMatrix.set(originNode.id, new Map());
            }
            
            // Calculate time for this segment (distance / 15 km/h * 60 minutes)
            const travelTimeMinutes = (length / 15) * 60;
            this.distanceMatrix.get(originNode.id).set(destinationNode.id, travelTimeMinutes);
        }

        return seg;
    });

        console.log("Segments loaded:", segments);
        console.log("Distance matrix populated:", this.distanceMatrix);

        const planJSON = {
            nodes: nodes.map(n => n.toJSON()),
            segments: segments.map(s => s.toJSON())
        };


        // 5. Créer le plan avec nodeMap (Map) au lieu de nodes (Array)
        this.plan = new Plan();
        this.plan.nodes = nodeMap;
        this.plan.segments = segments;

        return { success: true, plan: planJSON }
    }

    loadTourFromJSON(data) {
        if (!data) return null;

        const courier = data.courier
            ? new Courier(data.courier.id, data.courier.name)
            : null;

        const tour = new Tour(data.id || null, data.departureTime || "08:00", courier);

        const nodeMap = new Map();
        const getOrCreateNode = (nodeJson) => {
            if (!nodeJson) return null;
            if (nodeMap.has(nodeJson.id)) return nodeMap.get(nodeJson.id);
            const node = new Node(nodeJson.id, nodeJson.latitude, nodeJson.longitude, []);
            nodeMap.set(node.id, node);
            return node;
        };

        const demandMap = new Map();
        const getOrCreateDemand = (demandJson) => {
            if (!demandJson) return null;
            if (demandMap.has(demandJson.id)) return demandMap.get(demandJson.id);
            const demand = new Demand(
                demandJson.pickupAddress,
                demandJson.deliveryAddress,
                demandJson.pickupDuration,
                demandJson.deliveryDuration,
                demandJson.id
            );
            demandMap.set(demand.id, demand);
            return demand;
        };

        (data.stops || []).forEach(s => {
            const node = getOrCreateNode(s.node);
            const demand = s.demand ? getOrCreateDemand(s.demand) : null;
            const tp = new TourPoint(node, s.serviceDuration || 0, s.type, demand);
            tour.addStop(tp);
        });

        (data.legs || []).forEach(l => {
            const pathNodes = (l.path || []).map(getOrCreateNode);
            const leg = new Leg(null, null, pathNodes, l.distance || 0, l.travelTime || 0);
            tour.addLeg(leg);
        });

        tour.calculateTotalDistance();
        tour.calculateTotalDuration();
        return tour;
    }



    //lire un fichier XML de demandes de livraison.
    //parser parser <livraison .../>, pour chaque livraison créer un objet Demand
    //Ajouter les objets Demande à this.demandsList
    //Accepte soit un filePath (Node.js) soit un fileInput (navigateur)

    async loadDemandsFromXML(filePathOrInput) {
        let xmlContent;

        // Cas 1: Navigateur - fileInput avec files
        if (filePathOrInput && filePathOrInput.files) {
            // Vérifier qu'un fichier est sélectionné
            if (filePathOrInput.files.length === 0) {
                return { success: false, error: "Aucun fichier sélectionné. Veuillez choisir un fichier XML." };
            }

            const file = filePathOrInput.files[0];

            // Vérifier l'extension et le type MIME
            const fileName = file.name.toLowerCase();
            const isXmlExtension = fileName.endsWith(".xml");
            const isXmlMime = file.type === "text/xml" || file.type === "application/xml" || file.type === "";

            if (!isXmlExtension && !isXmlMime) {
                return { success: false, error: "Le fichier sélectionné n'est pas un fichier XML." };
            }

            // Lire le contenu du fichier
            try {
                xmlContent = await file.text();
            } catch (error) {
                return { success: false, error: "Impossible de lire le fichier. Vérifiez qu'il n'est pas corrompu." };
            }

            // Parser avec DOMParser (navigateur)
            const xmlDoc = new DOMParser().parseFromString(xmlContent, "application/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                return { success: false, error: "Le contenu du fichier XML est invalide ou mal formé." };
            }

            const root = xmlDoc.getElementsByTagName("demandeDeLivraisons")[0];
            if (!root) {
                return { success: false, error: "Le XML ne contient pas la balise <demandeDeLivraisons>." };
            }

            const entrepot = xmlDoc.getElementsByTagName("entrepot")[0];
            const livraisons = xmlDoc.getElementsByTagName("livraison");

            if (!entrepot) {
                return { success: false, error: "Aucun entrepôt trouvé dans le XML." };
            }

            if (livraisons.length === 0) {
                return { success: false, error: "Aucune livraison trouvée dans le XML." };
            }

            // Récupérer l'adresse de l'entrepôt et l'heure de départ
            const warehouseAddress = entrepot.getAttribute("adresse");
            const departureTime = entrepot.getAttribute("heureDepart");

            // Ne pas vider la liste pour conserver les demandes ajoutées manuellement
            // this.demandsList = [];

            // Parser chaque livraison
            let demandsLoaded = 0;
            for (let livraison of livraisons) {
                const pickupAddress = livraison.getAttribute("adresseEnlevement");
                const deliveryAddress = livraison.getAttribute("adresseLivraison");
                const pickupDuration = parseInt(livraison.getAttribute("dureeEnlevement"));
                const deliveryDuration = parseInt(livraison.getAttribute("dureeLivraison"));

                if (pickupAddress && deliveryAddress && !isNaN(pickupDuration) && !isNaN(deliveryDuration)) {
                    const demande = new Demand(
                        pickupAddress,
                        deliveryAddress,
                        pickupDuration,
                        deliveryDuration,
                        this.nextDemandId++
                    );
                    this.demandsList.push(demande);
                    demandsLoaded++;
                }
            }

            console.log(`${demandsLoaded} demandes chargées avec succès!`);
            return {
                success: true,
                demands: this.demandsList,
                warehouse: { address: warehouseAddress, departureTime: departureTime },
                count: demandsLoaded
            };
        }

        // Cas 2: Node.js - filePath (string)
        if (typeof require === 'undefined') {
            console.error("loadDemandsFromXML can only be used in Node.js environment for file paths");
            return { success: false, error: "Environnement Node.js requis pour charger depuis un chemin de fichier" };
        }

        try {
            const fs = require("fs");
            const xml2js = require("xml2js");

            //contenu du fichier en string
            xmlContent = await fs.promises.readFile(filePathOrInput, "utf-8");

            //Parser en objet JSon
            const json = await xml2js.parseStringPromise(xmlContent);

            //Récupérer la racine demandeDeLivraisons du json (ce code ne marche que pour les VF des XML)
            const root = json.demandeDeLivraisons;
            if (!root || !root.livraison) {
                console.log("Aucune balise <livraison> trouvée dans le XML.");
                return { success: false, error: "Aucune balise <livraison> trouvée dans le XML." };
            }
            //liste des livraisons du Json
            // livraisons c'est une liste dont chaque élément est une <livraison> du XML
            //chaque élément est un objet ayant un champ $(contient les attributs de la balise).

            const livraisons = root.livraison;
            console.log("Nombre de livraisons :", livraisons.length);

            // Ne pas vider la liste pour conserver les demandes ajoutées manuellement
            // this.demandsList = [];

            //On parcours chaque livraison
            for (const livraisonNode of livraisons) {
                const attrs = livraisonNode.$ || {};  //pour chaque livraisonNode on recup soit le champ $ (avec les attributs) soit un objet vide
                //récupérer les attributs
                const pickupAddress = attrs.adresseEnlevement;
                const deliveryAddress = attrs.adresseLivraison;
                const pickupDurationStr = attrs.dureeEnlevement;
                const deliveryDurationStr = attrs.dureeLivraison;
                //convertir les durées en nombres
                const pickupDuration = Number(pickupDurationStr);
                const deliveryDuration = Number(deliveryDurationStr);

                //Créer un objet Demande et l'ajouter à la liste des demandes.
                const demande = new Demand( pickupAddress,deliveryAddress,pickupDuration,deliveryDuration,this.nextDemandId++);
                this.demandsList.push(demande);
            };

            return { success: true, demands: this.demandsList, count: this.demandsList.length };

        } catch (error) {
            console.error("Error while reading demand XML:", error);
            return { success: false, error: error.message };
        }
    }

    addDemand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration) {
        const demande = new Demand( pickupAddress, deliveryAddress, pickupDuration, deliveryDuration,this.nextDemandId++);
        this.demandsList.push(demande);
        return demande;
    }

    removeDemandById(id) {
        const index = this.demandsList.findIndex(d => d.id === id);
        if (index !== -1) {
            this.demandsList.splice(index, 1);
            return true;
        }
        return false;
    }

    calculateTour() {
        let tour = new Tour(null, "8:00", new Courier("Jean"));

        // First leg: warehouse to first pickup
        let { path, distance, segments } = this.plan.findShortestPath(this.plan.warehouse.id, this.demandsList[0].pickupAddress);
        let leg = new Leg(this.plan.warehouse, path[path.length - 1], path, segments, distance, distance);
        tour.addLeg(leg);
        tour.addStop(new TourPoint(this.plan.warehouse, 0, "ENTREPOT", this.demandsList[0]));

        for (let i = 0; i < this.demandsList.length - 1; ++i) {
            let demand = this.demandsList[i];
            let nextDemand = this.demandsList[i + 1];
            let { path, distance, segments } = this.plan.findShortestPath(demand.pickupAddress, demand.deliveryAddress);
            let leg = new Leg(path[0], path[path.length - 1], path, segments, distance, distance);
            tour.addLeg(leg);
            tour.addStop(new TourPoint(path[0], demand.pickupDuration, "PICKUP", demand));
            tour.addStop(new TourPoint(path[path.length - 1], demand.deliveryDuration, "DELIVERY", demand));

            let { path: nextPath, distance: nextDistance, segments: nextSegments } = this.plan.findShortestPath(demand.deliveryAddress, nextDemand.pickupAddress);
            let nextLeg = new Leg(nextPath[0], nextPath[nextPath.length - 1], nextPath, nextSegments, nextDistance, nextDistance);
            tour.addLeg(nextLeg);
        }

        // Retour à l'entrepôt
        let lastDemand = this.demandsList[this.demandsList.length - 1];
        let { path: returnPath, distance: returnDistance, segments: returnSegments } = this.plan.findShortestPath(lastDemand.deliveryAddress, this.plan.warehouse.id);
        let returnLeg = new Leg(returnPath[0], this.plan.warehouse, returnPath, returnSegments, returnDistance, returnDistance);
        tour.addLeg(returnLeg);
        tour.addStop(new TourPoint(this.plan.warehouse, 0, "ENTREPOT", null));

        this.toursList.push(tour);
        return tour;
    }


    /**
     * Compute optimal tours for couriers using a simple Nearest Neighbor TSP algorithm
     * @param {Array<Courier>} couriers - List of available couriers
     * @returns {Array<Tour>} List of computed tours
     */
    computeTours(couriers) {

        if (!this.plan || !this.plan.nodes || this.demandsList.length === 0) {
            console.error("Cannot compute tours: plan or demands are missing");
            return [];
        }

        // Use pre-computed distance matrix from loadPlan
        const distanceMatrix = this.distanceMatrix ;

        // Divide demands among couriers
        const tours = [];
        const demandsPerCourier = Math.ceil(this.demandsList.length / couriers.length);

        for (let i = 0; i < couriers.length; i++) {
            const courier = couriers[i];
            const startIdx = i * demandsPerCourier;
            const endIdx = Math.min((i + 1) * demandsPerCourier, this.demandsList.length);

            if (startIdx >= this.demandsList.length) break;

            const assignedDemands = this.demandsList.slice(startIdx, endIdx);
            const tour = this.buildTourForCourier(courier, assignedDemands, distanceMatrix);

            console.log(`Tour for courier ${courier.id}:`, tour);
            if (tour) {
                tours.push(tour);
                this.toursList.push(tour);
            }
        }

        return tours;
    }

    /**
     * Dijkstra's algorithm to find shortest path between two nodes
     * @param {string} startId - Start node ID
     * @param {string} endId - End node ID
     * @returns {object} {path: [], distance: number} or {path: [], distance: Infinity} if unreachable
     */
    dijkstra(startId, endId) {
        if (startId === endId) {
            return { path: [startId], distance: 0 };
        }

        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Initialize distances
        for (const [nodeId] of this.plan.nodes) {
            distances.set(nodeId, Infinity);
            unvisited.add(nodeId);
        }
        distances.set(startId, 0);

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current = null;
            let minDist = Infinity;
            for (const nodeId of unvisited) {
                const dist = distances.get(nodeId);
                if (dist < minDist) {
                    minDist = dist;
                    current = nodeId;
                }
            }

            if (current === null || minDist === Infinity) break;
            if (current === endId) break;

            unvisited.delete(current);

            // Check neighbors through distance matrix
            if (this.distanceMatrix.has(current)) {
                const neighbors = this.distanceMatrix.get(current);
                for (const [neighborId, edgeDistance] of neighbors) {
                    if (!unvisited.has(neighborId)) continue;

                    const alt = distances.get(current) + edgeDistance;
                    if (alt < distances.get(neighborId)) {
                        distances.set(neighborId, alt);
                        previous.set(neighborId, current);
                    }
                }
            }
        }

        // Reconstruct path
        const path = [];
        let current = endId;

        if (distances.get(endId) === Infinity) {
            return { path: [], distance: Infinity };
        }

        while (current !== undefined) {
            path.unshift(current);
            current = previous.get(current);
        }

        return {
            path: path,
            distance: distances.get(endId)
        };
    }

    /**
     * Build a tour for a courier using Nearest Neighbor with Dijkstra pathfinding
     * Ensures pickup is visited before corresponding delivery
     * Uses real graph distances via Dijkstra algorithm
     * @param {Courier} courier - The courier
     * @param {Array<Demand>} demands - Demands to fulfill
     * @param {Map} distanceMatrix - Pre-computed distance matrix from loadPlan
     * @returns {Tour} Computed tour
     */
    buildTourForCourier(courier, demands, distanceMatrix) {
        if (demands.length === 0) return null;

        const warehouse = this.plan.warehouse;
        const tour = new Tour(null, "08:00", courier);

        let currentPoint = warehouse;
        const sequence = [currentPoint];
        const pickupsVisited = new Set();
        const deliveriesVisited = new Set();

        console.log("Building tour for courier", courier.id, "with demands:", demands);

        // Keep visiting points until all pickups and deliveries are done
        while (pickupsVisited.size < demands.length || deliveriesVisited.size < demands.length) {
            let bestDistance = Infinity;
            let bestPath = [];
            let nextTargetId = null;
            let targetDemandIndex = -1;
            let targetType = null; // 'pickup' or 'delivery'

            // Find nearest target using Dijkstra from current position
            for (let i = 0; i < demands.length; i++) {
                const demand = demands[i];
                const pickupId = demand.pickupAddress.id || demand.pickupAddress;
                const deliveryId = demand.deliveryAddress.id || demand.deliveryAddress;

                // Priority 1: Unvisited pickups - find shortest real path
                if (!pickupsVisited.has(pickupId)) {
                    const dijkstraResult = this.dijkstra(currentPoint.id, pickupId);
                    if (dijkstraResult.distance < bestDistance && dijkstraResult.distance !== Infinity) {
                        bestDistance = dijkstraResult.distance;
                        bestPath = dijkstraResult.path;
                        nextTargetId = pickupId;
                        targetDemandIndex = i;
                        targetType = 'pickup';
                    }
                }
                // Priority 2: Deliveries where pickup is done - find shortest real path
                else if (pickupsVisited.has(pickupId) && !deliveriesVisited.has(deliveryId)) {
                    const dijkstraResult = this.dijkstra(currentPoint.id, deliveryId);
                    if (dijkstraResult.distance < bestDistance && dijkstraResult.distance !== Infinity) {
                        bestDistance = dijkstraResult.distance;
                        bestPath = dijkstraResult.path;
                        nextTargetId = deliveryId;
                        targetDemandIndex = i;
                        targetType = 'delivery';
                    }
                }
            }

            if (targetDemandIndex === -1 || bestPath.length === 0) break; // No valid path found

            // Add all intermediate nodes from the Dijkstra path to sequence
            // Skip the first node (current) and add the rest
            for (let i = 1; i < bestPath.length; i++) {
                const nodeId = bestPath[i];
                const node = this.plan.nodes.get(nodeId);
                if (node) {
                    sequence.push(node);
                }
            }

            // Mark demand points as visited
            if (targetType === 'pickup') {
                pickupsVisited.add(nextTargetId);
            } else if (targetType === 'delivery') {
                deliveriesVisited.add(nextTargetId);
            }

            // Update current point to the target
            currentPoint = this.plan.nodes.get(nextTargetId);
        }

        // Add warehouse as final point (return to origin)
        const returnPath = this.dijkstra(currentPoint.id, warehouse.id);
        for (let i = 1; i < returnPath.path.length; i++) {
            const nodeId = returnPath.path[i];
            const node = this.plan.nodes.get(nodeId);
            if (node) {
                sequence.push(node);
            }
        }

        // Build tour with the complete sequence
        for (let i = 0; i < sequence.length; i++) {
            const point = sequence[i];
            tour.addStop({
                id: point.id,
                address: point,
                arrivalTime: "08:00",
                departureTime: "08:00"
            });
        }

        // Calculate tour metrics by summing edge distances
        let totalDistance = 0;
        for (let i = 0; i < sequence.length - 1; i++) {
            const p1 = sequence[i];
            const p2 = sequence[i + 1];
            const dist = this.getDistance(distanceMatrix, p1.id, p2.id) || 0;
            totalDistance += dist;
        }

        tour.totalDistance = totalDistance;

        console.log(`Tour computed for courier ${courier.id}: ${sequence.length} stops, distance: ${totalDistance.toFixed(2)}`);

        return tour;
    }

    /**
     * Get distance from distanceMatrix, returns Infinity if no connection
     * @param {Map} distanceMatrix - Pre-computed distance matrix
     * @param {string} fromId - Origin node ID
     * @param {string} toId - Destination node ID
     * @returns {number} Distance/time or Infinity if not connected
     */
    getDistance(distanceMatrix, fromId, toId) {
        if (fromId === toId) return 0;
        if (!distanceMatrix.has(fromId)) return Infinity;
        const distance = distanceMatrix.get(fromId).get(toId);
        return distance !== undefined ? distance : Infinity;
    }





}

// Export for Node and Browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = System;
}

if (typeof window !== "undefined") {
    window.System = System;
}

