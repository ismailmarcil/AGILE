const Courier = require("./courier");
const Demand = require("./demand");
const Tour = require("./tours");
const Plan = require("./plan");
const Leg = require("./leg");
const { TourPoint } = require("./tourpoint");

class System {
    plan = new Plan();

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
            return { success: false, error: " Aucun fichier sélectionné. Veuillez choisir un fichier XML." };
        }

        const file = fileInput.files[0];

        // 2. Vérifier l'extension et le type MIME
        const fileName = file.name.toLowerCase();
        const isXmlExtension = fileName.endsWith(".xml");
        const isXmlMime = file.type === "text/xml" || file.type === "application/xml" || file.type === "";

        if (!isXmlExtension && !isXmlMime) {
            return { success: false, error: "Le fichier sélectionné n'est pas un fichier XML." };
        }

        // 3. Lire le contenu du fichier
        let text;
        try {
            text = await file.text();
        } catch (error) {
            return { success: false, error: "Impossible de lire le fichier. Vérifiez qu'il n'est pas corrompu." };

        }

        // 4. Parser le XML
        const xmlDoc = new DOMParser().parseFromString(text, "application/xml");

        // Vérifier les erreurs de parsing
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            return { success: false, error: "Le contenu du fichier XML est invalide ou mal formé." };
        }

        const reseau = xmlDoc.getElementsByTagName("reseau")[0];
        const noeuds = xmlDoc.getElementsByTagName("noeud");
        const troncons = xmlDoc.getElementsByTagName("troncon");

        if (!reseau) {
            return { success: false, error: "Le XML ne contient pas la balise <reseau>. Ce n'est pas un plan valide." };
        }

        if (noeuds.length === 0) {
            return { success: false, error: "Aucun noeud trouvé dans le XML. Ce fichier ne correspond pas à un plan." };
        }

        if (troncons.length === 0) {
            return { success: false, error: "Aucun troncon trouvé dans le XML. Ce fichier ne correspond pas à un plan." };
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
            return { success: false, error: "Le XML n'a pas la structure d'un plan de carte (noeud/ troncon incorrects)." };
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
            livraisons.forEach((livraisonNode) => {
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
                const demande = new Demand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration, this.nextDemandId++);
                this.demandsList.push(demande);


            });

        } catch (error) {
            console.error("Error while reading demand XML:", error);
        }
    }

    addDemand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration) {
        const demande = new Demand(pickupAddress, deliveryAddress, pickupDuration, deliveryDuration, this.nextDemandId++);
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
        let leg = new Leg(this.plan.warehouse, path[path.length - 1], path, distance, distance);
        tour.addLeg(leg);
        tour.addStop(new TourPoint(this.plan.warehouse, 0, "ENTREPOT", this.demandsList[0]));

        for (let i = 0; i < this.demandsList.length - 1; ++i) {
            let demand = this.demandsList[i];
            let nextDemand = this.demandsList[i + 1];
            let { path, distance, segments } = this.plan.findShortestPath(demand.pickupAddress, demand.deliveryAddress);
            let leg = new Leg(path[0], path[path.length - 1], path, distance, distance);
            tour.addLeg(leg);
            tour.addStop(new TourPoint(path[0], demand.pickupDuration, "PICKUP", demand));
            tour.addStop(new TourPoint(path[path.length - 1], demand.deliveryDuration, "DELIVERY", demand));

            let { path: nextPath, distance: nextDistance, segments: nextSegments } = this.plan.findShortestPath(demand.deliveryAddress, nextDemand.pickupAddress);
            let nextLeg = new Leg(nextPath[0], nextPath[nextPath.length - 1], nextPath, nextDistance, nextDistance);
            tour.addLeg(nextLeg);
        }

        // Retour à l'entrepôt
        let lastDemand = this.demandsList[this.demandsList.length - 1];
        let { path: returnPath, distance: returnDistance, segments: returnSegments } = this.plan.findShortestPath(lastDemand.deliveryAddress, this.plan.warehouse.id);
        let returnLeg = new Leg(returnPath[0], this.plan.warehouse, returnPath, returnDistance, returnDistance);
        tour.addLeg(returnLeg);
        tour.addStop(new TourPoint(this.plan.warehouse, 0, "ENTREPOT", null));

        this.toursList.push(tour);
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

