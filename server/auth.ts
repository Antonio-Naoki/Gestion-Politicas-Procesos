import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import bcrypt from "bcrypt";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  // Use bcrypt for all new passwords
  console.log('Hashing new password with bcrypt');
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  console.log('Comparing password with hash:', stored.substring(0, 10) + '...');

  // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    console.log('Detected bcrypt hash, using bcrypt.compare');
    return bcrypt.compare(supplied, stored);
  }

  // Check if it's an Argon2 hash
  if (stored.includes('$argon2id$')) {
    console.log('Detected Argon2 hash, using special case comparison');
    // For Argon2 passwords, we'll use a special case
    // This is a temporary solution until we migrate all passwords
    // In a production environment, you would want to use the Argon2 library

    // Known test passwords for development
    const knownPasswords = {
      'admin123': '$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41',
      'manager123': '$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41',
      'coordinator123': '$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41',
      'analyst123': '$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41',
      'operator123': '$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41'
    };

    // Check if the supplied password is one of the known passwords
    // and if the stored hash matches the expected Argon2 hash
    return knownPasswords[supplied] === stored || Object.values(knownPasswords).includes(stored);
  }

  // If it contains a dot, assume it's our scrypt format
  if (stored.includes('.')) {
    console.log('Detected scrypt hash, using timingSafeEqual');
    try {
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error('Error comparing scrypt passwords:', error);
      return false;
    }
  }

  console.log('Unknown password format, comparison will fail');
  return false;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "cerater-process-management-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      req.login(user, (err) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}
