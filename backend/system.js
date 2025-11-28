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
        }

        return seg;
    });

        console.log("Segments loaded:", segments);

        const planJSON = {
            nodes: nodes.map(n => n.toJSON()),
            segments: segments.map(s => s.toJSON())
        };


        // 5. Créer le plan
        this.plan = new Plan();
        this.plan.nodes = nodes;
        this.plan.segments = segments;

        return { success: true, plan: planJSON }
    }

    //lire un fichier XML de demandes de livraison.
    //parser parser <livraison .../>, pour chaque livraison créer un objet Demannd
    //Ajouter les objets Demande à this.demandsList

    async loadDemandsFromXML(filePath) {
        // This method requires Node.js environment (fs and xml2js)
        if (typeof require === 'undefined') {
            console.error("loadDemandsFromXML can only be used in Node.js environment");
            return;
        }

        try {
            const fs = require("fs");
            const xml2js = require("xml2js");


            //contenu du fichier en string
            const xmlContent = await fs.promises.readFile(filePath, "utf-8");

            //Parser en objet JSon
            const json = await xml2js.parseStringPromise(xmlContent);

            //Récupérer la racine demandeDeLivraisons du json (ce code ne marche que pour les VF des XML)
            const root = json.demandeDeLivraisons;
            if (!root || !root.livraison) {
                console.log("Aucune balise <livraison> trouvée dans le XML.");
                return;
            }
            //liste des livraisons du Json
            // livraisons c'est une liste dont chaque élément est une <livraison> du XML
            //chaque élément est un objet ayant un champ $(contient les attributs de la balise).

            const livraisons = root.livraison;
            console.log("Nombre de livraisons :", livraisons.length);

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


            }

        } catch (error) {
            console.error("Error while reading demand XML:", error);
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

        // Build a distance matrix between all relevant nodes
        const allPoints = this.buildPointsList();
        const distanceMatrix = this.computeDistanceMatrix(allPoints);

        // Divide demands among couriers
        const tours = [];
        const demandsPerCourier = Math.ceil(this.demandsList.length / couriers.length);

        for (let i = 0; i < couriers.length; i++) {
            const courier = couriers[i];
            const startIdx = i * demandsPerCourier;
            const endIdx = Math.min((i + 1) * demandsPerCourier, this.demandsList.length);
            
            if (startIdx >= this.demandsList.length) break;

            const assignedDemands = this.demandsList.slice(startIdx, endIdx);
            const tour = this.buildTourForCourier(courier, assignedDemands, allPoints, distanceMatrix);
            
            if (tour) {
                tours.push(tour);
                this.toursList.push(tour);
            }
        }

        return tours;
    }

    /**
     * Build a list of all delivery points (pickup and delivery addresses)
     * @returns {Array} List of unique points
     */
    buildPointsList() {
        const pointsSet = new Set();
        const pointsMap = new Map();

        // Add warehouse as starting point
        if (this.plan.warehouse) {
            pointsMap.set(this.plan.warehouse.id, this.plan.warehouse);
            pointsSet.add(this.plan.warehouse.id);
        }

        // Add all pickup and delivery addresses
        this.demandsList.forEach(demand => {
            if (demand.pickupAddress) {
                const pickupId = demand.pickupAddress.id || demand.pickupAddress;
                pointsMap.set(pickupId, demand.pickupAddress);
                pointsSet.add(pickupId);
            }
            if (demand.deliveryAddress) {
                const deliveryId = demand.deliveryAddress.id || demand.deliveryAddress;
                pointsMap.set(deliveryId, demand.deliveryAddress);
                pointsSet.add(deliveryId);
            }
        });

        return Array.from(pointsSet).map(id => pointsMap.get(id));
    }

    /**
     * Compute Euclidean distance matrix between all points
     * @param {Array} points - List of points
     * @returns {Map} Distance matrix as map of maps
     */
    computeDistanceMatrix(points) {
        const distMatrix = new Map();

        for (let i = 0; i < points.length; i++) {
            const point1 = points[i];
            if (!distMatrix.has(point1.id)) {
                distMatrix.set(point1.id, new Map());
            }

            for (let j = 0; j < points.length; j++) {
                if (i === j) {
                    distMatrix.get(point1.id).set(points[j].id, 0);
                } else {
                    const point2 = points[j];
                    const distance = this.calculateDistance(point1, point2);
                    distMatrix.get(point1.id).set(point2.id, distance);
                }
            }
        }

        return distMatrix;
    }

    /**
     * Calculate Euclidean distance between two points
     * @param {Node} point1 - First point
     * @param {Node} point2 - Second point
     * @returns {number} Distance in degrees (approximation)
     */
    calculateDistance(point1, point2) {
        const dx = point1.latitude - point2.latitude;
        const dy = point1.longitude - point2.longitude;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Build a tour for a courier using Nearest Neighbor algorithm
     * @param {Courier} courier - The courier
     * @param {Array<Demand>} demands - Demands to fulfill
     * @param {Array} allPoints - All available points
     * @param {Map} distanceMatrix - Pre-computed distance matrix
     * @returns {Tour} Computed tour
     */
    buildTourForCourier(courier, demands, allPoints, distanceMatrix) {
        if (demands.length === 0) return null;

        // Create list of points to visit (pickup and delivery for each demand)
        const pointsToVisit = [];
        const pointsMap = new Map();

        demands.forEach(demand => {
            if (demand.pickupAddress) {
                const pickup = demand.pickupAddress;
                pointsToVisit.push({ point: pickup, type: 'pickup', demand: demand });
                pointsMap.set(pickup.id || pickup, pickup);
            }
            if (demand.deliveryAddress) {
                const delivery = demand.deliveryAddress;
                pointsToVisit.push({ point: delivery, type: 'delivery', demand: demand });
                pointsMap.set(delivery.id || delivery, delivery);
            }
        });

        // Start from warehouse
        const warehouse = this.plan.warehouse || allPoints[0];
        const tour = new Tour(null, "08:00", courier);

        // Apply Nearest Neighbor algorithm
        let currentPoint = warehouse;
        const visited = new Set([currentPoint.id]);
        const sequence = [currentPoint];

        while (pointsToVisit.length > 0) {
            // Find nearest unvisited point
            let nearestIdx = -1;
            let minDistance = Infinity;

            for (let i = 0; i < pointsToVisit.length; i++) {
                const nextPoint = pointsToVisit[i].point;
                const pointId = nextPoint.id || nextPoint;
                
                if (!visited.has(pointId)) {
                    const distance = distanceMatrix.has(currentPoint.id)
                        ? (distanceMatrix.get(currentPoint.id).get(pointId) || Infinity)
                        : this.calculateDistance(currentPoint, nextPoint);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestIdx = i;
                    }
                }
            }

            if (nearestIdx === -1) break; // All points visited

            // Visit nearest point
            const nextItem = pointsToVisit[nearestIdx];
            const nextPoint = nextItem.point;
            const pointId = nextPoint.id || nextPoint;

            visited.add(pointId);
            sequence.push(nextPoint);

            currentPoint = nextPoint;
        }

        // Add warehouse as final point (return to origin)
        sequence.push(warehouse);

        // Build tour with the sequence
        for (let i = 0; i < sequence.length; i++) {
            const point = sequence[i];
            // Create a simplified tour point (can be extended with TourPoint class)
            tour.addStop({
                id: point.id,
                address: point,
                arrivalTime: "08:00", // Simplified, can be calculated
                departureTime: "08:00"
            });
        }

        // Calculate tour metrics
        let totalDistance = 0;
        for (let i = 0; i < sequence.length - 1; i++) {
            const p1 = sequence[i];
            const p2 = sequence[i + 1];
            const dist = distanceMatrix.has(p1.id)
                ? (distanceMatrix.get(p1.id).get(p2.id) || 0)
                : this.calculateDistance(p1, p2);
            totalDistance += dist;
        }

        tour.totalDistance = totalDistance;

        console.log(`Tour computed for courier ${courier.id}: ${sequence.length} stops, distance: ${totalDistance.toFixed(2)}`);

        return tour;
    }





}

// Export for Node and Browser
if (typeof module !== "undefined" && module.exports) {
    module.exports = System;
}

if (typeof window !== "undefined") {
    window.System = System;
}

