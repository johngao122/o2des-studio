import { ProjectExportService } from "../services/ProjectExportService";
import depotDemo from "../data/sample_data/Depot-Demo.json";

console.log("Converting Depot-Demo.json to structured model...\n");

try {
    const result = ProjectExportService.convertToStructuredModel(depotDemo);

    console.log("=== ENTITY RELATIONSHIPS ===");
    console.log(JSON.stringify(result.model.entityRelationships, null, 2));

    console.log("\n=== RESOURCES ===");
    console.log(JSON.stringify(result.model.resources, null, 2));

    console.log("\n=== ACTIVITIES (first 3) ===");
    console.log(JSON.stringify(result.model.activities.slice(0, 3), null, 2));

    console.log("\n=== CONNECTIONS (first 5) ===");
    console.log(JSON.stringify(result.model.connections.slice(0, 5), null, 2));

    console.log(`\nTotal Activities: ${result.model.activities.length}`);
    console.log(`Total Connections: ${result.model.connections.length}`);

    const fs = require("fs");
    const path = require("path");

    const outputPath = path.join(__dirname, "converted-depot-demo.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`\nFull output written to: ${outputPath}`);
} catch (error) {
    console.error("Error during conversion:", error);
}
