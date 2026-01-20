import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../server/passwordUtils";

async function resetAdminPassword() {
  const adminEmail = "admin@example.com";
  const newPassword = "admin123";

  try {
    console.log(`🔄 Resetting password for ${adminEmail}...`);
    
    const hashedPassword = await hashPassword(newPassword);
    
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, adminEmail))
      .returning();
    
    if (updated) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ ADMIN PASSWORD RESET SUCCESSFUL`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Email:    ${adminEmail}`);
      console.log(`User ID:  ${updated.id}`);
      console.log(`Role:     ${updated.role}`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      console.log(`❌ Admin user not found: ${adminEmail}`);
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error(`❌ Failed to reset admin password: ${error.message}`);
    process.exit(1);
  }
}

resetAdminPassword();
