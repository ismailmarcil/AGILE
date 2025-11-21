export default class Plan {

    noeuds = [];
    troncons = [];
    entrepot = null;

    constructor(noeuds = [], troncons = [], entrepot = null) {
        this.noeuds = noeuds;
        this.troncons = troncons;
        this.entrepot = entrepot;
    }
}
