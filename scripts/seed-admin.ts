import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { organizers } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const email = "organizer@gulfood.com";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db.select().from(organizers).where(eq(organizers.email, email));
  
  if (existing.length > 0) {
    await db.update(organizers)
      .set({ passwordHash, isActive: true })
      .where(eq(organizers.email, email));
    console.log(`✅ Updated existing organizer account: ${email}`);
  } else {
    await db.insert(organizers).values({
      email,
      passwordHash,
      name: "Gulfood Organizer",
      role: "admin",
      isActive: true,
    });
    console.log(`✅ Created default organizer account: ${email}`);
  }
  
  console.log(`🔑 Login Credentials:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Failed to seed admin:", err);
  process.exit(1);
});
