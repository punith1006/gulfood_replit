import { db } from "../server/db";
import { exhibitors } from "../shared/schema";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExhibitorRecord {
  "Exhibitor Name": string;
  "Hall": string;
  "Stand": string;
  "Sectors": string;
  "Country": string;
  "Venue": string;
  "More Info": string;
  "logo": string;
}

async function importExhibitors() {
  try {
    console.log("🚀 Starting exhibitor import...");
    
    // Read JSON file
    const jsonPath = join(__dirname, "../attached_assets/exhibitors_data 3_1762774677470.json");
    const fileContent = fs.readFileSync(jsonPath, "utf-8");
    const exhibitorData: ExhibitorRecord[] = JSON.parse(fileContent);
    
    console.log(`📊 Found ${exhibitorData.length} exhibitors to import`);
    
    // Delete existing data
    console.log("🗑️  Clearing existing exhibitor data...");
    await db.delete(exhibitors);
    console.log("✅ Existing data cleared");
    
    // Prepare records for insertion
    const records = exhibitorData.map((record, index) => {
      // Handle "Not Available" and empty string values
      const moreInfo = record["More Info"];
      const info = (moreInfo === "Not Available" || moreInfo === "") ? null : moreInfo;
      
      const logoUrl = record.logo;
      const finalLogoUrl = (logoUrl === "Not Available" || logoUrl === "") ? null : logoUrl;
      
      return {
        name: record["Exhibitor Name"],
        sector: record["Sectors"], // Direct mapping as string (not array)
        country: record["Country"],
        booth: record["Stand"], // Stand → booth
        venue: record["Venue"],
        hall: record["Hall"],
        description: record["Sectors"], // Use sector as description for now
        info: info,
        logoUrl: finalLogoUrl
      };
    });
    
    // Batch insert in chunks of 100 for better performance
    const BATCH_SIZE = 100;
    let inserted = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await db.insert(exhibitors).values(batch);
      inserted += batch.length;
      
      if (inserted % 500 === 0 || inserted === records.length) {
        console.log(`📥 Inserted ${inserted}/${records.length} exhibitors...`);
      }
    }
    
    console.log(`✅ Successfully imported ${inserted} exhibitors`);
    
    // Verify import
    const count = await db.select().from(exhibitors);
    console.log(`🔍 Database verification: ${count.length} exhibitors found`);
    
    // Show sample records
    const sampleRecords = count.slice(0, 3);
    console.log("\n📋 Sample records:");
    sampleRecords.forEach((record, idx) => {
      console.log(`\n${idx + 1}. ${record.name}`);
      console.log(`   Sector: ${record.sector}`);
      console.log(`   Country: ${record.country}`);
      console.log(`   Venue: ${record.venue}`);
      console.log(`   Hall: ${record.hall}`);
      console.log(`   Booth: ${record.booth}`);
    });
    
    console.log("\n✨ Import complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error importing exhibitors:", error);
    process.exit(1);
  }
}

importExhibitors();
