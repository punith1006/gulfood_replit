import "dotenv/config";
import { db } from "../server/db";
import {
  chatConversations,
  chatFeedback,
  quickActionClicks,
  journeyPlans,
  leads,
  meetings,
  announcements,
  scheduledSessions,
  referrals,
  companyAnalyses,
  exhibitors
} from "../shared/schema";

async function seedAnalyticsData() {
  console.log("🚀 Starting synthetic beta analytics data generation...\n");

  // Fetch some real exhibitor IDs from the database to link accurately
  const existingExhibitors = await db.select({ id: exhibitors.id, name: exhibitors.name }).from(exhibitors).limit(50);
  const exhibitorIds = existingExhibitors.length > 0 ? existingExhibitors.map(e => e.id) : [1, 2, 3, 4, 5];

  // Helper to create dates in the last 14 days up to today (Sept 25, 2026)
  const now = new Date("2026-09-25T14:30:00Z");
  const getDateDaysAgo = (daysAgo: number, hoursOffset: number = 0) => {
    const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000);
    return d;
  };

  // ==========================================
  // 1. ANNOUNCEMENTS (4 Realistic event banners)
  // ==========================================
  console.log("📢 Seeding announcements...");
  await db.insert(announcements).values([
    {
      title: "Shuttle Bus Schedule Published",
      message: "Complimentary high-frequency shuttles operate between DWTC and Dubai Exhibition Centre (DEC) every 15 minutes.",
      targetAudience: "All",
      priority: "high",
      isActive: true,
      createdAt: getDateDaysAgo(8, 2)
    },
    {
      title: "VIP Buyers Lounge Now Accessible",
      message: "Accredited international delegation badge holders can access the networking lounge in Concourse 2, DWTC.",
      targetAudience: "Visitor",
      priority: "normal",
      isActive: true,
      createdAt: getDateDaysAgo(5, 4)
    },
    {
      title: "Opening Keynote: Future Food Summit",
      message: "Join international ministers and industry CEOs at the Al Multaqua Ballroom on Jan 26, 10:00 AM.",
      targetAudience: "All",
      priority: "high",
      isActive: true,
      createdAt: getDateDaysAgo(3, 1)
    },
    {
      title: "Exhibitor Setup Guidelines & Dock Timings",
      message: "Freight forwarders and stand contractors must finalize electrical certifications by Jan 24, 6:00 PM.",
      targetAudience: "Exhibitor",
      priority: "normal",
      isActive: true,
      createdAt: getDateDaysAgo(10, 5)
    }
  ]);

  // ==========================================
  // 2. SCHEDULED SESSIONS (5 Keynotes & Panels)
  // ==========================================
  console.log("📅 Seeding conference sessions...");
  await db.insert(scheduledSessions).values([
    {
      title: "Global Food Leaders Summit: Redefining Resilient Supply Chains",
      description: "Ministerial roundtable discussing cross-border food trade corridors, tariff rationalization, and cold chain innovation.",
      sessionDate: new Date("2026-01-26T10:00:00Z"),
      sessionTime: "10:00 AM - 11:30 AM",
      location: "Al Multaqua Ballroom, DWTC",
      targetAudience: "All",
      isActive: true,
      createdAt: getDateDaysAgo(12)
    },
    {
      title: "Plant-Based & Alternative Proteins: The GCC Consumer Shift",
      description: "Market intelligence briefing on retail adoption of vegan, dairy-free, and novel protein formulations across the UAE and KSA.",
      sessionDate: new Date("2026-01-26T14:00:00Z"),
      sessionTime: "2:00 PM - 3:15 PM",
      location: "Future Food Stage, Hall 4, DWTC",
      targetAudience: "Visitor",
      isActive: true,
      createdAt: getDateDaysAgo(11)
    },
    {
      title: "AgriTech & Arid Climate Farming Solutions",
      description: "Showcasing commercial hydroponics, CEA automation, and vertical farms scaling across the Gulf.",
      sessionDate: new Date("2026-01-27T11:00:00Z"),
      sessionTime: "11:00 AM - 12:30 PM",
      location: "DEC Arena Stage 1, Expo City",
      targetAudience: "All",
      isActive: true,
      createdAt: getDateDaysAgo(9)
    },
    {
      title: "Halal Economy 2026: Unified Standards & Global Certification",
      description: "Standardization authorities examine mutual recognition pacts across Southeast Asia, GCC, and European exporters.",
      sessionDate: new Date("2026-01-27T15:00:00Z"),
      sessionTime: "3:00 PM - 4:30 PM",
      location: "Conference Hall 3, DWTC",
      targetAudience: "Exhibitor",
      isActive: true,
      createdAt: getDateDaysAgo(8)
    },
    {
      title: "Sustainable Packaging at Scale: Circular Solutions for Food Brands",
      description: "Exploring biodegradable barriers, mono-material films, and Extended Producer Responsibility regulations.",
      sessionDate: new Date("2026-01-28T10:30:00Z"),
      sessionTime: "10:30 AM - 12:00 PM",
      location: "DEC Innovation Hub, Expo City",
      targetAudience: "Visitor",
      isActive: true,
      createdAt: getDateDaysAgo(6)
    }
  ]);

  // ==========================================
  // 3. COMPANY ANALYSES (18 Registrations)
  // ==========================================
  console.log("🏢 Seeding company analyses / registrations...");
  const sampleCompanies = [
    { name: "Almarai Dairy Co", domain: "almarai.com", sector: ["Dairy Products"], score: 96, sum: "Leading regional dairy & beverage giant exploring export distribution." },
    { name: "Carrefour Middle East (Majid Al Futtaim)", domain: "majidalfuttaim.com", sector: ["Retail & Distribution"], score: 98, sum: "Tier-1 hypermarket chain sourcing European gourmet lines." },
    { name: "Lulu Group International", domain: "lulugroupworldwide.com", sector: ["Retail & Distribution", "World Food"], score: 99, sum: "Major conglomerate sourcing private label grains, pulses, and FMCG." },
    { name: "Savola Foods", domain: "savola.com", sector: ["Fats & Oils", "Pulses, Grains & Cereals"], score: 94, sum: "Major edible oils and culinary manufacturer expanding specialty portfolio." },
    { name: "Spinneys Dubai LLC", domain: "spinneys.com", sector: ["Organic & Natural Products"], score: 95, sum: "Premium supermarket chain seeking organic, regenerative farm suppliers." },
    { name: "Americana Foods", domain: "americanafoods.com", sector: ["Meat & Poultry", "Frozen Food"], score: 93, sum: "Pan-Arab QSR and frozen foods processor sourcing ingredients." },
    { name: "Gulf Gourmet General Trading", domain: "gulfgourmet.ae", sector: ["World Food", "Beverages"], score: 89, sum: "Artisanal food distributor catering to 5-star hospitality in Dubai." },
    { name: "Danone Middle East", domain: "danone.com", sector: ["Dairy Products", "Health, Wellness & Free-From"], score: 95, sum: "Global dairy & plant-based nutrition brand exhibiting innovations." },
    { name: "Lactalis GCC", domain: "lactalis.com", sector: ["Dairy Products"], score: 97, sum: "French cheese, butter, and milk powder exporter expanding MENA." },
    { name: "Barakat Quality Plus", domain: "barakatfresh.ae", sector: ["Fresh Produce", "Beverages"], score: 92, sum: "Leading UAE fresh juice and pre-cut produce manufacturer." },
    { name: "Agthia Group PJSC", domain: "agthia.com", sector: ["Beverages", "Snacks & Nuts"], score: 94, sum: "UAE food and beverage flagship assessing bakery and water expansions." },
    { name: "Emirates Flight Catering", domain: "ekfc.com", sector: ["Catering Equipment & Supplies", "World Food"], score: 96, sum: "Aviation catering facility sourcing international packaged food." },
    { name: "IFFCO Group", domain: "iffco.com", sector: ["Fats & Oils", "Bakery & Confectionery"], score: 93, sum: "Multi-food manufacturer seeking packaging automation partners." },
    { name: "Al Rawabi Dairy Company", domain: "alrawabi.ae", sector: ["Dairy Products"], score: 95, sum: "Pioneer dairy producer exploring functional beverage lines." },
    { name: "IFFCO Packaging Division", domain: "iffco.com", sector: ["Food Packaging & Machinery"], score: 90, sum: "Industrial packaging manufacturer evaluating eco-barrier films." },
    { name: "Bateel International", domain: "bateel.com", sector: ["Bakery & Confectionery", "Organic & Natural Products"], score: 92, sum: "Luxury confectionery and date gourmet purveyor sourcing ingredients." },
    { name: "FreshMart UK Ltd", domain: "freshmart.co.uk", sector: ["Dairy Products", "Plant-Based & Vegan"], score: 91, sum: "UK supermarket procurement division sourcing direct from manufacturers." },
    { name: "Global Halal Importers", domain: "globalhalal.de", sector: ["Halal Products", "Meat & Poultry"], score: 88, sum: "European distributor connecting Brazilian and Australian meat packers." }
  ];

  for (let i = 0; i < sampleCompanies.length; i++) {
    const c = sampleCompanies[i];
    await db.insert(companyAnalyses).values({
      companyIdentifier: c.domain,
      companyName: c.name,
      sector: c.sector,
      relevanceScore: c.score,
      scoreReasoning: "Strong industry alignment with Gulfood 2026 exhibiting sectors and sourcing categories.",
      summary: c.sum,
      benefits: ["Direct B2B supplier networking", "Access to 2,400+ international manufacturers", "Preferential pricing negotiation"],
      matchedExhibitorsCount: 14 + (i % 8),
      matchedExhibitorIds: exhibitorIds.slice(0, 5),
      createdAt: getDateDaysAgo(14 - i * 0.7, 3)
    });
  }

  // ==========================================
  // 4. JOURNEY PLANS (32 Personalized Plans)
  // ==========================================
  console.log("🗺️ Seeding journey plans...");
  const visitorRoles = ["Procurement Manager", "Category Buyer", "Managing Director", "Import/Export Specialist", "Executive Chef", "Operations Director"];
  const categoriesList = [
    ["Dairy Products", "Beverages"],
    ["Meat & Poultry", "Halal Products"],
    ["Organic & Natural Products", "Plant-Based & Vegan"],
    ["Pulses, Grains & Cereals", "Fats & Oils"],
    ["Bakery & Confectionery", "Snacks & Nuts"],
    ["Food Packaging & Machinery", "Catering Equipment & Supplies"],
    ["World Food", "Private Label"],
    ["Beverages", "Coffee & Tea"]
  ];

  for (let i = 1; i <= 32; i++) {
    const daysAgo = Math.max(0, 13 - Math.floor(i / 2.5));
    const randomHours = Math.floor(Math.random() * 12);
    const role = visitorRoles[i % visitorRoles.length];
    const comp = sampleCompanies[i % sampleCompanies.length].name;
    const cats = categoriesList[i % categoriesList.length];
    const days = (i % 4) + 1; // 1 to 4 days

    await db.insert(journeyPlans).values({
      sessionId: `session_journey_${i}_${Date.now()}`,
      name: `Attendee ${i} (${role.split(' ')[0]})`,
      email: `attendee.${i}@${sampleCompanies[i % sampleCompanies.length].domain}`,
      organization: comp,
      role: role,
      interestCategories: cats,
      attendanceIntents: ["Direct Sourcing", "Supplier Evaluation", "B2B Meetings"],
      numberOfDays: days,
      relevanceScore: 82 + (i % 16),
      scoreJustification: `High sector overlap with ${cats.join(' & ')} exhibitors at DWTC and DEC venues.`,
      matchedExhibitorIds: exhibitorIds.slice(0, 6),
      preferredExhibitorIds: exhibitorIds.slice(0, 2),
      createdAt: getDateDaysAgo(daysAgo, randomHours)
    });
  }

  // ==========================================
  // 5. CHAT CONVERSATIONS & FEEDBACK (42 Sessions)
  // ==========================================
  console.log("💬 Seeding chat conversations & sentiment ratings...");
  const conversationTemplates = [
    {
      userRole: "Visitor",
      language: "English",
      messages: [
        { role: "assistant", content: "👋 Hello! I'm Faris, your AI assistant for Gulfood 2026. How can I help you today?" },
        { role: "user", content: "Where can I find premium cheese and dairy exhibitors from Europe?" },
        { role: "assistant", content: "You will find European dairy leaders primarily in Hall 1 and Hall 2 at Dubai World Trade Centre (DWTC). Top exhibitors include Lactalis Group (Hall 1 - A234) and Danone (Hall 1 - C123)." },
        { role: "user", content: "Thank you, that is very helpful!" },
        { role: "assistant", content: "You're very welcome! Would you like me to schedule a meeting or plan your route between halls?" }
      ]
    },
    {
      userRole: "Visitor",
      language: "English",
      messages: [
        { role: "assistant", content: "👋 Hello! I'm Faris, your AI assistant for Gulfood 2026. How can I help you today?" },
        { role: "user", content: "How do I travel between DWTC and Expo City Dubai?" },
        { role: "assistant", content: "The distance between DWTC and Expo City Dubai (DEC) is approximately 12 km. The free official shuttle bus runs every 15 minutes, or a taxi takes roughly 20-25 minutes." },
        { role: "user", content: "Awesome, thanks!" }
      ]
    },
    {
      userRole: "Exhibitor",
      language: "English",
      messages: [
        { role: "assistant", content: "👋 Hello! I'm Faris, your AI assistant for Gulfood 2026. How can I help you today?" },
        { role: "user", content: "What are the freight and stand setup deadlines for Hall 4?" },
        { role: "assistant", content: "Contractor access begins on Jan 22. Heavy machinery and cold display units must be on-stand by Jan 24 at 18:00 GST for technical inspection." },
        { role: "user", content: "Understood, thank you." }
      ]
    },
    {
      userRole: "Visitor",
      language: "Arabic",
      messages: [
        { role: "assistant", content: "مرحباً! أنا فارس، مساعدك الذكي لمعرض جلفود 2026. كيف يمكنني مساعدتك؟" },
        { role: "user", content: "أين أجد شركات اللحوم الحلال المعتمدة؟" },
        { role: "assistant", content: "أهلاً بك! تتركز أجنحة اللحوم والدواجن الحلال في قاعات المركز التجاري بدبي (Hall 3 و Trade Centre Arena). أنصحك بزيارة أجنحة الشركات البرازيلية والأسترالية المعتمدة." }
      ]
    },
    {
      userRole: "Visitor",
      language: "Hindi",
      messages: [
        { role: "assistant", content: "नमस्ते! मैं फारिस हूँ, गल्फूड 2026 के लिए आपका एआई गाइड।" },
        { role: "user", content: "मसालों और चावल के प्रमुख प्रदर्शक कहाँ मिलेंगे?" },
        { role: "assistant", content: "नमस्ते! मसाले, चावल और अनाज के प्रमुख स्टॉल दुबई वर्ल्ड ट्रेड सेंटर के नॉर्थ हॉल 5 और हॉल 6 में स्थित हैं।" }
      ]
    }
  ];

  for (let i = 1; i <= 42; i++) {
    const template = conversationTemplates[i % conversationTemplates.length];
    const daysAgo = Math.max(0, 13 - Math.floor(i / 3.2));
    const hours = (i * 3) % 24;
    const sessionUuid = `session_beta_${i}_${Date.now()}`;
    const createdAt = getDateDaysAgo(daysAgo, hours);
    const updatedAt = new Date(createdAt.getTime() + (4 + (i % 6)) * 60 * 1000); // 4-9 min duration

    await db.insert(chatConversations).values({
      sessionId: sessionUuid,
      messages: template.messages,
      userRole: template.userRole,
      language: template.language,
      createdAt: createdAt,
      updatedAt: updatedAt
    });

    // Seed feedback on roughly 75% of conversations (high satisfaction rate 95%)
    if (i % 4 !== 0) {
      const isPositive = i % 18 !== 0; // ~94% positive
      await db.insert(chatFeedback).values({
        sessionId: sessionUuid,
        messageIndex: 2,
        isAccurate: isPositive,
        feedbackText: isPositive ? "Accurate booth details and venue directions" : "Could include more specific booth contact numbers",
        createdAt: new Date(updatedAt.getTime() + 30 * 1000)
      });
    }

    // Seed quick action clicks
    if (i % 2 === 0) {
      const actions = ["Browse Exhibitors", "Navigate the Venue", "Food & Dining Guide", "Hotel Recommendations", "View Event Schedule"];
      await db.insert(quickActionClicks).values({
        sessionId: sessionUuid,
        action: actions[i % actions.length],
        userRole: template.userRole as any,
        createdAt: createdAt
      });
    }
  }

  // ==========================================
  // 6. BUSINESS LEADS (22 Verified Leads)
  // ==========================================
  console.log("🎯 Seeding business leads...");
  const leadsData = [
    { name: "David Miller", email: "david.miller@freshmart.co.uk", comp: "FreshMart UK", role: "Visitor", cat: "Dairy & Plant-Based" },
    { name: "Fatima Al-Mansoor", email: "fatima@almarai.com", comp: "Almarai Co", role: "Exhibitor", cat: "Export Expansion" },
    { name: "Jean-Pierre Blanc", email: "jp.blanc@lactalis.fr", comp: "Lactalis Export", role: "Exhibitor", cat: "B2B Distribution" },
    { name: "Rajesh Sharma", email: "r.sharma@luluhypermarket.com", comp: "Lulu International", role: "Visitor", cat: "Private Label Sourcing" },
    { name: "Kariuki Mwangi", email: "kmwangi@nairobitrade.co.ke", comp: "East Africa AgriFoods", role: "Visitor", cat: "Tea & Coffee" },
    { name: "Elena Rostova", email: "elena@euroconfection.de", comp: "EuroConfectionery GmbH", role: "Visitor", cat: "Bakery & Sweets" },
    { name: "Tareq Al-Ghamdi", email: "tareq@savola.com", comp: "Savola Oils", role: "Visitor", cat: "Bulk Edible Oils" },
    { name: "Chen Wei", email: "chen.wei@shanghaifood.cn", comp: "Shanghai AgriFoods", role: "Exhibitor", cat: "Packaging Machinery" },
    { name: "Sarah Jenkins", email: "sjenkins@spinneys.ae", comp: "Spinneys Dubai", role: "Visitor", cat: "Organic Certified" },
    { name: "Marcus Van Dijk", email: "marcus@hollanddairy.nl", comp: "Friesland Trading", role: "Exhibitor", cat: "Cheese Specialties" },
    { name: "Zaid Al-Husseini", email: "zaid@gulfgourmet.ae", comp: "Gulf Gourmet", role: "Visitor", cat: "Hospitality Foodservice" },
    { name: "Ananya Iyer", email: "ananya@itcagro.in", comp: "ITC Agri Business", role: "Visitor", cat: "Spices & Pulses" }
  ];

  for (let i = 0; i < leadsData.length; i++) {
    const l = leadsData[i];
    const daysAgo = Math.max(0, 12 - i);
    try {
      await db.insert(leads).values({
        name: l.name,
        email: l.email,
        company: l.comp,
        role: l.role,
        category: l.cat,
        capturedVia: i % 2 === 0 ? "conversational" : "direct",
        status: i % 3 === 0 ? "qualified" : i % 2 === 0 ? "contacted" : "new",
        notes: "Interested in bilateral buyer-seller match meetings during exhibition.",
        createdAt: getDateDaysAgo(daysAgo, i * 2)
      });
    } catch {
      // Skip if email already exists
    }
  }

  // ==========================================
  // 7. MEETINGS (14 B2B Appointments)
  // ==========================================
  console.log("🤝 Seeding B2B exhibitor meetings...");
  for (let i = 0; i < 14; i++) {
    const daysAgo = Math.max(0, 10 - Math.floor(i / 1.5));
    const meetingDate = new Date("2026-01-26T09:00:00Z");
    meetingDate.setDate(meetingDate.getDate() + (i % 5));
    meetingDate.setHours(9 + (i % 7));

    await db.insert(meetings).values({
      visitorName: leadsData[i % leadsData.length].name,
      visitorEmail: leadsData[i % leadsData.length].email,
      visitorCompany: leadsData[i % leadsData.length].comp,
      exhibitorId: exhibitorIds[i % exhibitorIds.length],
      meetingDate: meetingDate,
      duration: 30,
      status: i % 4 === 0 ? "completed" : i % 2 === 0 ? "confirmed" : "pending",
      notes: "Discussion on GCC distribution contracts and bulk container shipments.",
      createdAt: getDateDaysAgo(daysAgo, i)
    });
  }

  // ==========================================
  // 8. REFERRALS (24 Social Shares & Clicks)
  // ==========================================
  console.log("🔗 Seeding viral referrals...");
  const platforms = ["LinkedIn", "WhatsApp", "Email", "Twitter"];
  for (let i = 0; i < 24; i++) {
    const daysAgo = Math.max(0, 11 - Math.floor(i / 2));
    const hasConverted = i % 3 === 0;
    const clickedAt = getDateDaysAgo(daysAgo, i);

    await db.insert(referrals).values({
      referralCode: `GULF26-${1000 + i}`,
      platform: platforms[i % platforms.length],
      referrerName: leadsData[i % leadsData.length].name,
      referrerEmail: leadsData[i % leadsData.length].email,
      sessionId: `session_ref_${i}`,
      clickedAt: clickedAt,
      convertedAt: hasConverted ? new Date(clickedAt.getTime() + 15 * 60 * 1000) : null,
      refereeEmail: hasConverted ? `referred_${i}@business.com` : null,
      refereeCategory: hasConverted ? "Visitor" : null
    });
  }

  console.log("\n✨ Beta Analytics data successfully seeded!");
  process.exit(0);
}

seedAnalyticsData().catch((err) => {
  console.error("❌ Error seeding analytics data:", err);
  process.exit(1);
});
