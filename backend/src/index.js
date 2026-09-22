import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";
import validUrl from "valid-url";
import cron from "node-cron";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// --- Rate limit only the write path, not redirects ---
const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 links/minute/IP — generous enough for demo use, tight enough to deter abuse
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many links created. Try again in a minute." },
});

// --- Create a short link ---
app.post("/api/links", createLimiter, async (req, res) => {
  const { longUrl, customSlug, ttlHours } = req.body;

  if (!longUrl || !validUrl.isWebUri(longUrl)) {
    return res.status(400).json({ error: "Please provide a valid URL." });
  }

  let slug = customSlug?.trim();
  if (slug) {
    const existing = await prisma.link.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "That alias is already taken." });
    }
  } else {
    // Retry loop guards against the (rare) nanoid collision
    do {
      slug = nanoid(7);
    } while (await prisma.link.findUnique({ where: { slug } }));
  }

  const expiresAt = ttlHours
    ? new Date(Date.now() + ttlHours * 60 * 60 * 1000)
    : null;

  const link = await prisma.link.create({
    data: { slug, longUrl, expiresAt },
  });

  res.status(201).json({
    slug: link.slug,
    shortUrl: `${req.protocol}://${req.get("host")}/${link.slug}`,
    expiresAt: link.expiresAt,
  });
});

// --- Redirect ---
app.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const link = await prisma.link.findUnique({ where: { slug } });

  if (!link || (link.expiresAt && link.expiresAt < new Date())) {
    return res.status(404).send("Link not found or expired.");
  }

  // Redirect immediately; log the click without making the visitor wait on it
  res.redirect(302, link.longUrl);
  prisma.click
    .create({
      data: {
        linkId: link.id,
        referrer: req.get("referer") || null,
        userAgent: req.get("user-agent") || null,
      },
    })
    .catch((err) => console.error("Click logging failed:", err));
});

// --- Stats ---
app.get("/api/links/:slug/stats", async (req, res) => {
  const link = await prisma.link.findUnique({
    where: { slug: req.params.slug },
    include: { clicks: true },
  });
  if (!link) return res.status(404).json({ error: "Link not found." });

  res.json({
    slug: link.slug,
    longUrl: link.longUrl,
    totalClicks: link.clicks.length,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    recentClicks: link.clicks.slice(-20).reverse(),
  });
});

// --- Cleanup job: delete expired links daily at 3am ---
cron.schedule("0 3 * * *", async () => {
  const { count } = await prisma.link.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (count) console.log(`Cleaned up ${count} expired links.`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
