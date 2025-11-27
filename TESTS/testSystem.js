const fs = require("fs");
const xml2js = require("xml2js");
const System = require("../backend/system.js");

(async () => {
    const system = new System([]);
    await system.loadDemandsFromXML("../demandeMoyen3.xml");
    console.log("Loaded Demands:", system.demandsList);

    console.log("\n je rajoute une  demande  \n");
    system.addDemand("25175791","26086130",300,300)
    console.log("liste mise à jour", system.demandsList);


})();