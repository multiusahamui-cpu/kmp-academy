
import { db } from "./index";
import { users, categories, courses } from "../schema/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

// --- MOCK DATA (Hardcoded here to be standalone) ---
const MOCK_CATEGORIES = [
  { name: 'Teknologi & Coding', slug: 'teknologi-coding' },
  { name: 'Bisnis Digital', slug: 'bisnis-digital' },
  { name: 'Manajemen Koperasi', slug: 'manajemen-koperasi' },
  { name: 'Keuangan & Akuntansi', slug: 'keuangan-akuntansi' },
  { name: 'Soft Skills', slug: 'soft-skills' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Sertifikasi Profesi', slug: 'sertifikasi' },
];

const seedDatabase = async () => {
  console.log("🌱 Starting Database Seed...");

  try {
    // 1. Create Schema if not exists (Menjawab pertanyaan No. 2)
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS academy`);
    console.log("✅ Schema 'academy' ensured.");

    // Password default "123456"
    const hashedPassword = await bcrypt.hash("123456", 10);

    // 2. Seed Users
    console.log("Creating Users...");
    
    // Check if superadmin exists to avoid duplicates
    const superAdminExists = await db.select().from(users).where(sql`${users.email} = 'superadmin@kodman.id'`);
    
    if (superAdminExists.length === 0) {
        const newUsers = await db.insert(users).values([
        // Internal Management
        { 
            name: 'Super Admin', 
            email: 'superadmin@kodman.id', 
            password: hashedPassword, 
            role: 'SUPERADMIN', 
            status: 'ACTIVE' 
        },
        { 
            name: 'Ulpermadi Ibrahim', 
            email: 'ulpermadi@kodman.id', 
            password: hashedPassword, 
            role: 'DIRECTOR', 
            status: 'ACTIVE',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        { 
            name: 'System Admin', 
            email: 'admin@kodman.id', 
            password: hashedPassword, 
            role: 'ADMIN_SYSTEM', 
            status: 'ACTIVE' 
        },
        // Providers
        { 
            name: 'Budi Santoso', 
            email: 'budi@creator.kodman.id', 
            password: hashedPassword, 
            role: 'CREATOR', 
            status: 'ACTIVE' 
        },
        { 
            name: 'Siti Aminah', 
            email: 'siti@mentor.kodman.id', 
            password: hashedPassword, 
            role: 'MENTOR', 
            status: 'ACTIVE' 
        },
        // Students
        { 
            name: 'Andi Pratama', 
            email: 'student@kodman.id', 
            password: hashedPassword, 
            role: 'STUDENT', 
            status: 'ACTIVE' 
        },
        ]).returning();
        console.log(`✅ ${newUsers.length} Users Created.`);
    } else {
        console.log("ℹ️ Users already seeded.");
    }

    // 3. Seed Categories
    console.log("Creating Categories...");
    // Simple check via count or upsert logic
    await db.insert(categories).values(MOCK_CATEGORIES).onConflictDoNothing();
    console.log("✅ Categories Seeded.");

    // 4. Seed Courses (Optional Example)
    // Fetch a creator first
    const creator = await db.query.users.findFirst({ where: (users, { eq }) => eq(users.role, 'CREATOR') });
    
    if (creator) {
        await db.insert(courses).values([
            {
                title: 'Mastering React & Vite Ecosystem',
                slug: 'mastering-react-vite',
                description: 'Pelajari cara membangun aplikasi web modern dengan React, TypeScript, dan Vite.',
                instructorId: creator.id,
                instructorName: creator.name,
                price: 500000,
                type: 'MANDIRI',
                status: 'PUBLISHED',
                thumbnail: 'https://picsum.photos/seed/react/400/250',
                sessions: 5
            }
        ]).onConflictDoNothing();
        console.log("✅ Mock Course Created.");
    }

    console.log("🎉 Seeding Completed Successfully!");
    (process as any).exit(0);

  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    (process as any).exit(1);
  }
};

seedDatabase();
