import { storage } from "./storage";

const sampleExhibitors = [
  // DAIRY (15 companies) - Hall 1
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
    name: "Danone",
    sector: "Dairy",
    country: "France",
    booth: "Hall 1 - C123",
    description: "Global food company specializing in dairy products, plant-based foods, and specialized nutrition",
    website: "https://www.danone.com",
    products: ["Yogurt", "Milk", "Plant-Based Dairy", "Baby Nutrition"],
    contactEmail: "contact@danone.com",
    contactPhone: "+33 1 44 35 20 20"
  },
  {
    name: "Fonterra",
    sector: "Dairy",
    country: "New Zealand",
    booth: "Hall 1 - D234",
    description: "World's largest dairy exporter with premium milk powder, cheese, and butter products",
    website: "https://www.fonterra.com",
    products: ["Milk Powder", "Cheese", "Butter", "Cream"],
    contactEmail: "info@fonterra.com",
    contactPhone: "+64 9 374 9000"
  },
  {
    name: "FrieslandCampina",
    sector: "Dairy",
    country: "Netherlands",
    booth: "Hall 1 - E345",
    description: "International dairy cooperative offering consumer products and ingredients worldwide",
    website: "https://www.frieslandcampina.com",
    products: ["Milk", "Cheese", "Yogurt", "Infant Nutrition"],
    contactEmail: "contact@frieslandcampina.com",
    contactPhone: "+31 30 686 9111"
  },
  {
    name: "Arla Foods",
    sector: "Dairy",
    country: "Denmark",
    booth: "Hall 1 - F456",
    description: "Farmer-owned dairy cooperative producing organic and conventional dairy products",
    website: "https://www.arla.com",
    products: ["Organic Milk", "Butter", "Cheese", "Cream"],
    contactEmail: "info@arla.com",
    contactPhone: "+45 89 38 10 00"
  },
  {
    name: "Savencia Fromage & Dairy",
    sector: "Dairy",
    country: "France",
    booth: "Hall 1 - H567",
    description: "Specialty cheese producer with premium brands and traditional recipes",
    website: "https://www.savencia-fromagedairy.com",
    products: ["Specialty Cheese", "Gourmet Dairy", "Premium Butter"],
    contactEmail: "contact@savencia.com",
    contactPhone: "+33 1 34 58 63 00"
  },
  {
    name: "Land O'Lakes",
    sector: "Dairy",
    country: "USA",
    booth: "Hall 1 - J678",
    description: "Member-owned cooperative providing butter, cheese, and dairy ingredients",
    website: "https://www.landolakes.com",
    products: ["Butter", "Cheese", "Milk", "Dairy Ingredients"],
    contactEmail: "info@landolakes.com",
    contactPhone: "+1 651 481 2222"
  },
  {
    name: "Juhayna Food Industries",
    sector: "Dairy",
    country: "Egypt",
    booth: "Hall 1 - K789",
    description: "Leading dairy and juice producer serving the Middle East and North Africa",
    website: "https://www.juhayna.com",
    products: ["Milk", "Yogurt", "Juice", "Laban"],
    contactEmail: "info@juhayna.com",
    contactPhone: "+20 2 3854 4725"
  },
  {
    name: "Saudia Dairy & Foodstuff Company",
    sector: "Dairy",
    country: "Saudi Arabia",
    booth: "Hall 1 - L890",
    description: "Premium dairy manufacturer with fresh milk, cheese, and yogurt products",
    website: "https://www.sadafco.com",
    products: ["Fresh Milk", "Cheese", "Yogurt", "Cream"],
    contactEmail: "info@sadafco.com",
    contactPhone: "+966 12 637 0077"
  },
  {
    name: "Baladna",
    sector: "Dairy",
    country: "Qatar",
    booth: "Hall 1 - M901",
    description: "Qatar's leading dairy producer with farm-fresh milk and dairy products",
    website: "https://www.baladna.com",
    products: ["Fresh Milk", "Laban", "Yogurt", "Cheese"],
    contactEmail: "info@baladna.com",
    contactPhone: "+974 4480 0000"
  },
  {
    name: "Pinar Dairy",
    sector: "Dairy",
    country: "Turkey",
    booth: "Hall 1 - N012",
    description: "Premium Turkish dairy products including milk, cheese, and yogurt",
    website: "https://www.pinar.com.tr",
    products: ["Milk", "White Cheese", "Yogurt", "Butter"],
    contactEmail: "info@pinar.com.tr",
    contactPhone: "+90 232 376 1100"
  },
  {
    name: "Emborg",
    sector: "Dairy",
    country: "Denmark",
    booth: "Hall 1 - O123",
    description: "Danish dairy brand offering cheese, butter, and cream products across Asia and Middle East",
    website: "https://www.emborg.com",
    products: ["Cheese", "Butter", "Cream Cheese", "Dairy Products"],
    contactEmail: "contact@emborg.com",
    contactPhone: "+45 97 34 30 00"
  },

  // BEVERAGES (15 companies) - Hall 2
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
    name: "PepsiCo",
    sector: "Beverages",
    country: "USA",
    booth: "Hall 2 - A123",
    description: "Global food and beverage leader with iconic brands and innovative products",
    website: "https://www.pepsico.com",
    products: ["Soft Drinks", "Juices", "Sports Drinks", "Energy Drinks"],
    contactEmail: "info@pepsico.com",
    contactPhone: "+1 914 253 2000"
  },
  {
    name: "Red Bull",
    sector: "Beverages",
    country: "Austria",
    booth: "Hall 2 - B234",
    description: "World's leading energy drink brand giving wings to people and ideas",
    website: "https://www.redbull.com",
    products: ["Energy Drinks", "Functional Beverages"],
    contactEmail: "contact@redbull.com",
    contactPhone: "+43 662 6582 0"
  },
  {
    name: "Evian",
    sector: "Beverages",
    country: "France",
    booth: "Hall 2 - C345",
    description: "Premium natural mineral water from the French Alps",
    website: "https://www.evian.com",
    products: ["Natural Mineral Water", "Sparkling Water"],
    contactEmail: "contact@evian.com",
    contactPhone: "+33 1 44 35 20 20"
  },
  {
    name: "Barakat Quality Plus",
    sector: "Beverages",
    country: "UAE",
    booth: "Hall 2 - E456",
    description: "Fresh juice and dairy products from farm to table in 24 hours",
    website: "https://www.barakat.com",
    products: ["Fresh Juice", "Smoothies", "Milk", "Yogurt"],
    contactEmail: "info@barakat.com",
    contactPhone: "+971 4 340 8626"
  },
  {
    name: "Mai Dubai",
    sector: "Beverages",
    country: "UAE",
    booth: "Hall 2 - G567",
    description: "Premium bottled water brand serving the UAE and GCC markets",
    website: "https://www.maidubai.com",
    products: ["Bottled Water", "Mineral Water"],
    contactEmail: "info@maidubai.com",
    contactPhone: "+971 4 454 5400"
  },
  {
    name: "Al Ain Water",
    sector: "Beverages",
    country: "UAE",
    booth: "Hall 2 - I789",
    description: "Natural mineral water from Al Ain's protected aquifers",
    website: "https://www.alainwater.ae",
    products: ["Mineral Water", "Bottled Water"],
    contactEmail: "info@alainwater.ae",
    contactPhone: "+971 3 781 4444"
  },
  {
    name: "Rani Float",
    sector: "Beverages",
    country: "UAE",
    booth: "Hall 2 - K890",
    description: "Fruit juice drinks with real fruit pieces enjoyed across the Middle East",
    website: "https://www.ranijuice.com",
    products: ["Fruit Juice", "Juice Drinks", "Nectars"],
    contactEmail: "info@ranijuice.com",
    contactPhone: "+971 6 534 7777"
  },
  {
    name: "Arizona Beverage Company",
    sector: "Beverages",
    country: "USA",
    booth: "Hall 2 - L901",
    description: "Iconic iced tea and beverage brand with distinctive tall cans",
    website: "https://www.drinkarizona.com",
    products: ["Iced Tea", "Fruit Drinks", "Energy Drinks"],
    contactEmail: "info@drinkarizona.com",
    contactPhone: "+1 516 812 0300"
  },
  {
    name: "Nestlé Waters",
    sector: "Beverages",
    country: "Switzerland",
    booth: "Hall 2 - M012",
    description: "Portfolio of premium bottled water brands including Perrier and S.Pellegrino",
    website: "https://www.nestle-waters.com",
    products: ["Mineral Water", "Sparkling Water", "Spring Water"],
    contactEmail: "contact@nestle.com",
    contactPhone: "+41 21 924 21 11"
  },
  {
    name: "Monster Energy",
    sector: "Beverages",
    country: "USA",
    booth: "Hall 2 - N123",
    description: "Leading energy drink brand with diverse flavor portfolio",
    website: "https://www.monsterenergy.com",
    products: ["Energy Drinks", "Sports Drinks"],
    contactEmail: "info@monsterenergy.com",
    contactPhone: "+1 951 739 6200"
  },
  {
    name: "Schweppes",
    sector: "Beverages",
    country: "UK",
    booth: "Hall 2 - O234",
    description: "Classic mixer and soft drink brand with tonic water and ginger ale",
    website: "https://www.schweppes.com",
    products: ["Tonic Water", "Ginger Ale", "Soft Drinks"],
    contactEmail: "contact@schweppes.com",
    contactPhone: "+44 20 7173 0200"
  },

  // MEAT & POULTRY (10 companies) - Hall 3
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
    name: "Perdue Farms",
    sector: "Meat & Poultry",
    country: "USA",
    booth: "Hall 3 - A123",
    description: "Premium poultry producer with fourth-generation family farming values",
    website: "https://www.perdue.com",
    products: ["Chicken", "Turkey", "Pork"],
    contactEmail: "info@perdue.com",
    contactPhone: "+1 410 543 3000"
  },
  {
    name: "Hormel Foods",
    sector: "Meat & Poultry",
    country: "USA",
    booth: "Hall 3 - B234",
    description: "Global branded food company with iconic meat and protein products",
    website: "https://www.hormelfoods.com",
    products: ["Bacon", "Ham", "Sausages", "Deli Meats"],
    contactEmail: "info@hormel.com",
    contactPhone: "+1 507 437 5611"
  },
  {
    name: "Smithfield Foods",
    sector: "Meat & Poultry",
    country: "USA",
    booth: "Hall 3 - D345",
    description: "World's largest pork processor and hog producer",
    website: "https://www.smithfieldfoods.com",
    products: ["Pork", "Ham", "Bacon", "Sausages"],
    contactEmail: "info@smithfieldfoods.com",
    contactPhone: "+1 757 365 3000"
  },
  {
    name: "BRF S.A.",
    sector: "Meat & Poultry",
    country: "Brazil",
    booth: "Hall 3 - E456",
    description: "One of the largest food companies globally, producing chicken, pork, and processed foods",
    website: "https://www.brf-global.com",
    products: ["Chicken", "Pork", "Processed Foods", "Frozen Foods"],
    contactEmail: "contact@brf-global.com",
    contactPhone: "+55 11 2322 5000"
  },
  {
    name: "Siniora Food Industries",
    sector: "Meat & Poultry",
    country: "Jordan",
    booth: "Hall 3 - F567",
    description: "Leading regional meat processor specializing in cold cuts and processed meats",
    website: "https://www.siniora.com",
    products: ["Cold Cuts", "Sausages", "Frozen Meats", "Processed Meats"],
    contactEmail: "info@siniora.com",
    contactPhone: "+962 6 487 1010"
  },
  {
    name: "Al Islami Foods",
    sector: "Meat & Poultry",
    country: "UAE",
    booth: "Hall 3 - G678",
    description: "Halal frozen food producer serving the GCC and international markets",
    website: "https://www.alislamifoods.com",
    products: ["Frozen Chicken", "Frozen Beef", "Burgers", "Nuggets"],
    contactEmail: "info@alislamifoods.com",
    contactPhone: "+971 4 320 8889"
  },
  {
    name: "Cargill Protein",
    sector: "Meat & Poultry",
    country: "USA",
    booth: "Hall 3 - H789",
    description: "Global protein provider with beef, poultry, and egg products",
    website: "https://www.cargill.com",
    products: ["Beef", "Chicken", "Turkey", "Eggs"],
    contactEmail: "info@cargill.com",
    contactPhone: "+1 952 742 7575"
  },
  {
    name: "Nema Food Company",
    sector: "Meat & Poultry",
    country: "Saudi Arabia",
    booth: "Hall 3 - I890",
    description: "Premium halal meat processor serving the Middle East market",
    website: "https://www.nemafood.com",
    products: ["Fresh Meat", "Frozen Meat", "Cold Cuts", "Sausages"],
    contactEmail: "info@nemafood.com",
    contactPhone: "+966 11 265 0000"
  },

  // PLANT-BASED (6 companies) - Hall 4
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
    name: "Impossible Foods",
    sector: "Plant-Based",
    country: "USA",
    booth: "Hall 4 - L345",
    description: "Plant-based meat substitutes that taste like real meat",
    website: "https://www.impossiblefoods.com",
    products: ["Plant-Based Beef", "Plant-Based Sausage", "Plant-Based Chicken"],
    contactEmail: "contact@impossiblefoods.com",
    contactPhone: "+1 650 556 1300"
  },
  {
    name: "Heura Foods",
    sector: "Plant-Based",
    country: "Spain",
    booth: "Hall 4 - A123",
    description: "Mediterranean plant-based meat producer with innovative products",
    website: "https://www.heurafoods.com",
    products: ["Plant-Based Chicken", "Plant-Based Burgers", "Plant-Based Meatballs"],
    contactEmail: "info@heurafoods.com",
    contactPhone: "+34 93 123 4567"
  },
  {
    name: "Redefine Meat",
    sector: "Plant-Based",
    country: "Israel",
    booth: "Hall 4 - B234",
    description: "3D-printed plant-based meat with exceptional taste and texture",
    website: "https://www.redefinemeat.com",
    products: ["Plant-Based Beef", "Plant-Based Lamb", "Plant-Based Pork"],
    contactEmail: "contact@redefinemeat.com",
    contactPhone: "+972 3 123 4567"
  },
  {
    name: "The Vegetarian Butcher",
    sector: "Plant-Based",
    country: "Netherlands",
    booth: "Hall 4 - C345",
    description: "Unilever-owned plant-based meat brand with wide product range",
    website: "https://www.thevegetarianbutcher.com",
    products: ["Plant-Based Chicken", "Plant-Based Beef", "Plant-Based Bacon"],
    contactEmail: "info@thevegetarianbutcher.com",
    contactPhone: "+31 20 217 4000"
  },
  {
    name: "Eat Just",
    sector: "Plant-Based",
    country: "USA",
    booth: "Hall 4 - D456",
    description: "Plant-based egg and meat alternatives with sustainable innovation",
    website: "https://www.eat-just.com",
    products: ["Plant-Based Eggs", "Cultured Meat", "Plant-Based Mayo"],
    contactEmail: "info@eat-just.com",
    contactPhone: "+1 415 529 0400"
  },

  // SNACKS & CONFECTIONERY (10 companies) - Hall 5
  {
    name: "Mondelez International",
    sector: "Snacks",
    country: "USA",
    booth: "Hall 5 - A123",
    description: "Global snacking powerhouse with iconic chocolate and biscuit brands",
    website: "https://www.mondelezinternational.com",
    products: ["Chocolate", "Biscuits", "Gum", "Candy"],
    contactEmail: "info@mdlz.com",
    contactPhone: "+1 847 943 4000"
  },
  {
    name: "Mars Wrigley",
    sector: "Snacks",
    country: "USA",
    booth: "Hall 5 - B234",
    description: "Manufacturer of chocolate, chewing gum, and confectionery products",
    website: "https://www.mars.com",
    products: ["Chocolate Bars", "Candy", "Gum", "Mints"],
    contactEmail: "contact@mars.com",
    contactPhone: "+1 703 821 4900"
  },
  {
    name: "Ferrero Group",
    sector: "Snacks",
    country: "Italy",
    booth: "Hall 5 - C345",
    description: "Premium confectionery and chocolate manufacturer with beloved brands",
    website: "https://www.ferrero.com",
    products: ["Chocolate", "Hazelnut Spreads", "Wafers", "Pralines"],
    contactEmail: "info@ferrero.com",
    contactPhone: "+39 0173 313111"
  },
  {
    name: "Kellogg's",
    sector: "Snacks",
    country: "USA",
    booth: "Hall 5 - D456",
    description: "Leading producer of cereal and convenience foods",
    website: "https://www.kelloggs.com",
    products: ["Cereals", "Snack Bars", "Crackers", "Cookies"],
    contactEmail: "info@kelloggs.com",
    contactPhone: "+1 269 961 2000"
  },
  {
    name: "General Mills",
    sector: "Snacks",
    country: "USA",
    booth: "Hall 5 - E567",
    description: "Global food company with cereals, snacks, and baking products",
    website: "https://www.generalmills.com",
    products: ["Cereals", "Snack Bars", "Baking Mixes", "Yogurt"],
    contactEmail: "info@genmills.com",
    contactPhone: "+1 763 764 7600"
  },
  {
    name: "Hershey Company",
    sector: "Snacks",
    country: "USA",
    booth: "Hall 5 - F678",
    description: "Leading chocolate and confectionery manufacturer in North America",
    website: "https://www.thehersheycompany.com",
    products: ["Chocolate", "Candy", "Baking Products", "Snacks"],
    contactEmail: "info@hersheys.com",
    contactPhone: "+1 717 534 4200"
  },
  {
    name: "Perfetti Van Melle",
    sector: "Snacks",
    country: "Italy",
    booth: "Hall 5 - G789",
    description: "Global confectionery manufacturer with gum and candy brands",
    website: "https://www.perfettivanmelle.com",
    products: ["Chewing Gum", "Candy", "Lollipops", "Mints"],
    contactEmail: "contact@perfettivanmelle.com",
    contactPhone: "+39 02 7343 1"
  },
  {
    name: "Bahlsen",
    sector: "Snacks",
    country: "Germany",
    booth: "Hall 5 - H890",
    description: "Premium biscuit and cookie manufacturer since 1889",
    website: "https://www.bahlsen.com",
    products: ["Biscuits", "Cookies", "Wafers", "Snacks"],
    contactEmail: "info@bahlsen.de",
    contactPhone: "+49 511 960 0"
  },
  {
    name: "Bateel International",
    sector: "Snacks",
    country: "UAE",
    booth: "Hall 5 - I901",
    description: "Luxury dates and gourmet gift producer from the Middle East",
    website: "https://www.bateel.com",
    products: ["Premium Dates", "Chocolates", "Nuts", "Gift Boxes"],
    contactEmail: "info@bateel.com",
    contactPhone: "+971 4 321 0777"
  },
  {
    name: "Patchi",
    sector: "Snacks",
    country: "Lebanon",
    booth: "Hall 5 - J012",
    description: "Luxury chocolate brand renowned for artisanal chocolates and elegant packaging",
    website: "https://www.patchi.com",
    products: ["Luxury Chocolates", "Gift Boxes", "Pralines", "Truffles"],
    contactEmail: "info@patchi.com",
    contactPhone: "+961 1 513 513"
  },

  // FATS & OILS (5 companies) - Hall 6
  {
    name: "Savola Group",
    sector: "Fats & Oils",
    country: "Saudi Arabia",
    booth: "Hall 6 - A123",
    description: "Leading food producer with edible oils, sugar, and retail operations",
    website: "https://www.savola.com",
    products: ["Vegetable Oil", "Olive Oil", "Ghee", "Sugar"],
    contactEmail: "info@savola.com",
    contactPhone: "+966 12 606 9595"
  },
  {
    name: "Bunge Limited",
    sector: "Fats & Oils",
    country: "USA",
    booth: "Hall 6 - B234",
    description: "Global agribusiness and food company producing oils and fats",
    website: "https://www.bunge.com",
    products: ["Vegetable Oils", "Margarine", "Shortening", "Food Ingredients"],
    contactEmail: "info@bunge.com",
    contactPhone: "+1 914 684 2800"
  },
  {
    name: "Cargill Oils",
    sector: "Fats & Oils",
    country: "USA",
    booth: "Hall 6 - C345",
    description: "Leading producer of edible oils and specialty fats",
    website: "https://www.cargill.com",
    products: ["Sunflower Oil", "Canola Oil", "Palm Oil", "Specialty Fats"],
    contactEmail: "oils@cargill.com",
    contactPhone: "+1 952 742 7575"
  },
  {
    name: "Afia International",
    sector: "Fats & Oils",
    country: "Saudi Arabia",
    booth: "Hall 6 - D456",
    description: "Premium cooking oil brand serving the Middle East and Africa",
    website: "https://www.afia-international.com",
    products: ["Corn Oil", "Sunflower Oil", "Olive Oil", "Blended Oils"],
    contactEmail: "info@afia-international.com",
    contactPhone: "+966 12 606 9595"
  },
  {
    name: "IFFCO",
    sector: "Fats & Oils",
    country: "UAE",
    booth: "Hall 6 - E567",
    description: "Integrated food solutions provider with oils, fats, and consumer products",
    website: "https://www.iffco.com",
    products: ["Cooking Oil", "Margarine", "Ghee", "Shortening"],
    contactEmail: "info@iffco.com",
    contactPhone: "+971 6 528 4444"
  },
  {
    name: "Amul",
    sector: "Dairy",
    country: "India",
    booth: "Hall 1 - D201",
    description: "India's largest dairy cooperative with a wide range of milk and dairy products",
    website: "https://www.amul.com",
    products: ["Milk", "Butter", "Cheese", "Ice Cream", "Ghee"],
    contactEmail: "info@amul.coop",
    contactPhone: "+91 2692 258506"
  },
  {
    name: "Mother Dairy",
    sector: "Dairy",
    country: "India",
    booth: "Hall 1 - D202",
    description: "Leading dairy brand in India offering fresh milk and dairy products",
    website: "https://www.motherdairy.com",
    products: ["Fresh Milk", "Curd", "Paneer", "Ghee", "Butter"],
    contactEmail: "customer@motherdairy.com",
    contactPhone: "+91 11 2681 2001"
  },
  {
    name: "Britannia Industries",
    sector: "Snacks",
    country: "India",
    booth: "Hall 5 - J101",
    description: "India's leading food company with biscuits, bread, and dairy products",
    website: "https://www.britannia.co.in",
    products: ["Biscuits", "Bread", "Cakes", "Dairy Products"],
    contactEmail: "info@britannia.co.in",
    contactPhone: "+91 33 2466 1950"
  },
  {
    name: "Parle Products",
    sector: "Snacks",
    country: "India",
    booth: "Hall 5 - J102",
    description: "Iconic Indian biscuit and confectionery manufacturer",
    website: "https://www.parleproducts.com",
    products: ["Biscuits", "Candies", "Snacks", "Wafers"],
    contactEmail: "info@parleproducts.com",
    contactPhone: "+91 22 2857 2823"
  },
  {
    name: "Haldiram's",
    sector: "Snacks",
    country: "India",
    booth: "Hall 5 - J103",
    description: "Premium Indian snacks and sweets manufacturer with global presence",
    website: "https://www.haldirams.com",
    products: ["Namkeen", "Sweets", "Ready-to-Eat", "Frozen Foods"],
    contactEmail: "info@haldirams.com",
    contactPhone: "+91 11 4079 4079"
  },
  {
    name: "ITC Foods",
    sector: "Snacks",
    country: "India",
    booth: "Hall 5 - J104",
    description: "Diversified food company with brands across multiple categories",
    website: "https://www.itcportal.com",
    products: ["Biscuits", "Noodles", "Snacks", "Ready-to-Cook"],
    contactEmail: "foods@itc.in",
    contactPhone: "+91 33 2288 9371"
  },
  {
    name: "Dabur India",
    sector: "Beverages",
    country: "India",
    booth: "Hall 2 - L101",
    description: "Leading FMCG company with juices, health drinks, and food products",
    website: "https://www.dabur.com",
    products: ["Juices", "Honey", "Culinary Pastes", "Health Drinks"],
    contactEmail: "info@dabur.com",
    contactPhone: "+91 11 2371 7940"
  },
  {
    name: "Adani Wilmar",
    sector: "Fats & Oils",
    country: "India",
    booth: "Hall 6 - F678",
    description: "Leading edible oil company with Fortune brand",
    website: "https://www.adaniwilmar.com",
    products: ["Edible Oils", "Wheat Flour", "Rice", "Pulses"],
    contactEmail: "info@adaniwilmar.com",
    contactPhone: "+91 79 2656 3555"
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
