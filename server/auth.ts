import type { Request, Response, NextFunction } from "express";
import passportLib from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export const passport = passportLib;

// Seed an admin user if not present
export async function ensureAdminSeed() {
  try {
    const adminEmail = "emon@gmail.com";
    const [adminUser] = await db.select().from(users).where(eq(users.email, adminEmail));
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("emon3234", 12);
      await storage.upsertUser({
        id: "admin-user-id",
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: "Emon",
        lastName: "Admin",
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
}

// Define user type
export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  firstName?: string;
  lastName?: string;
}

// Local strategy for admin login (email + password)
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        // Check for admin credentials
        if (email !== "emon@gmail.com") {
          console.log("Login failed: Invalid email");
          return done(null, false, { message: "Invalid credentials" });
        }

        const hashedPassword = await bcrypt.hash("emon3234", 12); // This should match the seeded password
        const match = await bcrypt.compare(password, hashedPassword);
        
        if (!match) {
          console.log("Login failed: Invalid password");
          return done(null, false, { message: "Invalid credentials" });
        }

        // Create admin user object
        const adminUser: AuthUser = {
          id: "admin-user-id",
          email: "emon@gmail.com",
          isAdmin: true,
          firstName: "Emon",
          lastName: "Admin"
        };

        console.log("Login successful for admin:", adminUser.email);
        return done(null, adminUser);
      } catch (err) {
        console.error("Login error:", err);
        return done(err as Error);
      }
    }
  )
);

// Simplified session handling
passport.serializeUser((user: any, done) => {
  console.log("Serializing user:", user.email);
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    console.log("Deserializing user. ID:", id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      console.error("User not found for ID:", id);
      return done(null, false);
    }
    console.log("Deserialized user:", user.email);
    done(null, user);
  } catch (error) {
    console.error("Error deserializing user:", error);
    done(error);
  }
});

// Admin check middleware
export async function isAdmin(req: any, res: Response, next: NextFunction) {
  try {
    // Support multiple user shapes: passport's req.user, or session-based req.session.user
    const rawUser = req.user || req.session?.user;
    if (!rawUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Determine user id from common shapes
    const userId = rawUser.id || rawUser?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid user structure" });
    }

    // Load the user from storage and verify admin flag
    const dbUser = await storage.getUser(userId);
    if (!dbUser || !dbUser.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Attach the normalized user to req for downstream handlers
    req.adminUser = dbUser;
    next();
  } catch (error) {
    console.error("Error in admin auth check:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}
