import { ProjectExportService } from "../services/ProjectExportService";
import depotDemo from "../data/sample_data/Depot-Demo.json";

try {
    const result = ProjectExportService.convertToStructuredModel(depotDemo);

    const fs = require("fs");
    const path = require("path");

    const outputPath = path.join(__dirname, "converted-depot-demo.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error during conversion:", error);
}
