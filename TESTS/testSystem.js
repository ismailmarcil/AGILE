const fs = require("fs");
const xml2js = require("xml2js");
const System = require("../backend/system.js");

(async () => {
    const system = new System([]);
    await system.loadDemandsFromXML("../demandeMoyen3.xml");
})();