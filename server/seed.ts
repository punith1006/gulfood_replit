import { storage } from "./storage";

const sampleExhibitors = [
  {
    name: "Lactalis Group",
    sector: "Dairy",
    country: "France",
    booth: "Hall 1 - A234",
    description: "Global dairy leader offering premium cheese, milk, and yogurt products with over 85,000 employees worldwide",
    website: "https://www.lactalis.com",
    products: ["Cheese", "Milk", "Yogurt", "Butter"],
    contactEmail: "contact@lactalis.com",
    contactPhone: "+33 1 40 76 00 00"
  },
  {
    name: "Al Rawabi Dairy",
    sector: "Dairy",
    country: "UAE",
    booth: "Hall 1 - B112",
    description: "Leading regional dairy producer with fresh milk, laban, and dairy products serving the GCC region",
    website: "https://www.alrawabi.ae",
    products: ["Fresh Milk", "Laban", "Yogurt", "Cheese"],
    contactEmail: "info@alrawabi.ae",
    contactPhone: "+971 4 338 8700"
  },
  {
    name: "Tyson Foods",
    sector: "Meat & Poultry",
    country: "USA",
    booth: "Hall 3 - C445",
    description: "Premium meat and poultry supplier with global distribution network and sustainable practices",
    website: "https://www.tysonfoods.com",
    products: ["Chicken", "Beef", "Pork", "Prepared Foods"],
    contactEmail: "info@tyson.com",
    contactPhone: "+1 479 290 4000"
  },
  {
    name: "Estrella Damm",
    sector: "Beverages",
    country: "Spain",
    booth: "Hall 2 - D567",
    description: "Premium beer and beverage manufacturer with authentic Mediterranean heritage",
    website: "https://www.estrelladamm.com",
    products: ["Beer", "Lager", "Craft Beer"],
    contactEmail: "contact@damm.es",
    contactPhone: "+34 93 290 99 00"
  },
  {
    name: "Beyond Meat",
    sector: "Plant-Based",
    country: "USA",
    booth: "Hall 4 - E789",
    description: "Innovative plant-based meat alternatives revolutionizing the food industry",
    website: "https://www.beyondmeat.com",
    products: ["Plant-Based Burgers", "Sausages", "Ground Meat"],
    contactEmail: "info@beyondmeat.com",
    contactPhone: "+1 866 756 4112"
  },
  {
    name: "Oatly",
    sector: "Beverages",
    country: "Sweden",
    booth: "Hall 2 - F234",
    description: "Oat milk and dairy alternative products for sustainable living",
    website: "https://www.oatly.com",
    products: ["Oat Milk", "Oat Cream", "Oat Yogurt"],
    contactEmail: "hello@oatly.com",
    contactPhone: "+46 40 30 10 00"
  },
  {
    name: "Nestlé Professional",
    sector: "Dairy",
    country: "Switzerland",
    booth: "Hall 1 - G456",
    description: "Professional food service solutions including coffee, beverages, and culinary products",
    website: "https://www.nestle-professional.com",
    products: ["Coffee", "Beverages", "Culinary Products", "Dairy"],
    contactEmail: "professional@nestle.com",
    contactPhone: "+41 21 924 21 11"
  },
  {
    name: "Coca-Cola Middle East",
    sector: "Beverages",
    country: "UAE",
    booth: "Hall 2 - H678",
    description: "Leading beverage company offering a wide range of refreshing drinks",
    website: "https://www.coca-cola-me.com",
    products: ["Soft Drinks", "Juices", "Water", "Energy Drinks"],
    contactEmail: "info@coca-cola.com",
    contactPhone: "+971 4 366 7777"
  },
  {
    name: "Almarai Company",
    sector: "Dairy",
    country: "Saudi Arabia",
    booth: "Hall 1 - I890",
    description: "Largest integrated dairy foods company in the Middle East",
    website: "https://www.almarai.com",
    products: ["Milk", "Cheese", "Butter", "Yogurt", "Juice"],
    contactEmail: "info@almarai.com",
    contactPhone: "+966 11 263 8888"
  },
  {
    name: "Danone Waters",
    sector: "Beverages",
    country: "France",
    booth: "Hall 2 - J123",
    description: "Premium bottled water and healthy hydration solutions",
    website: "https://www.danone.com",
    products: ["Bottled Water", "Mineral Water", "Flavored Water"],
    contactEmail: "contact@danone.com",
    contactPhone: "+33 1 44 35 20 20"
  },
  {
    name: "JBS Foods",
    sector: "Meat & Poultry",
    country: "Brazil",
    booth: "Hall 3 - K234",
    description: "World's largest protein producer with beef, poultry, and pork products",
    website: "https://www.jbs.com.br",
    products: ["Beef", "Chicken", "Pork", "Processed Meats"],
    contactEmail: "info@jbs.com.br",
    contactPhone: "+55 11 3144 4000"
  },
  {
    name: "Impossible Foods",
    sector: "Plant-Based",
    country: "USA",
    booth: "Hall 4 - L345",
    description: "Plant-based meat substitutes that taste like real meat",
    website: "https://www.impossiblefoods.com",
    products: ["Plant-Based Beef", "Plant-Based Sausage", "Plant-Based Chicken"],
    contactEmail: "contact@impossiblefoods.com",
    contactPhone: "+1 650 556 1300"
  }
];

export async function seedDatabase() {
  try {
    console.log("🌱 Checking database seed status...");
    
    const existingExhibitors = await storage.getExhibitors();
    
    if (existingExhibitors.length >= sampleExhibitors.length) {
      console.log(`✅ Database already seeded with ${existingExhibitors.length} exhibitors, skipping...`);
      return;
    }

    console.log("📝 Seeding database with sample exhibitors...");
    
    for (const exhibitor of sampleExhibitors) {
      try {
        await storage.createExhibitor(exhibitor);
      } catch (error: any) {
        if (error?.code === '23505') {
          console.log(`⏭️  Exhibitor ${exhibitor.name} already exists, skipping...`);
        } else {
          console.error(`❌ Error seeding exhibitor ${exhibitor.name}:`, error);
        }
      }
    }

    const finalCount = await storage.getExhibitors();
    console.log(`✅ Database seeding complete. Total exhibitors: ${finalCount.length}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}
