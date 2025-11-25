class View {
    constructor(startTime) {
        this.startTime = startTime;
        this.listPickupDeliveryPoints = []; // Array of {tourPoint, startTime, endTime}
        this.pairPickupDelivery = []; // Array of {fromTourPoint, toTourPoint}
    }

    addPickupDeliveryPoint(tourPoint, startTime, endTime) {
        this.listPickupDeliveryPoints.push({ tourPoint, startTime, endTime });
    }

    addPickupDeliveryPair(fromTourPoint, toTourPoint) {
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

module.exports = View;