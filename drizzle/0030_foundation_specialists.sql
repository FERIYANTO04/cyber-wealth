-- Add foundation-critical specialist agents. Idempotent by role.
INSERT INTO "agent" ("id","name","role","mandate","status","data_source","sort_order")
SELECT v.id,v.name,v.role,v.mandate,'active','live',v.sort_order FROM (VALUES
('agent-ai-security-compliance','Benteng — Keamanan & Kepatuhan','AI Security & Compliance','Audit keamanan aplikasi, privasi, akses, backup, dan kepatuhan.',20),
('agent-ai-quality-reliability','Mutu — Kualitas & Keandalan','AI Quality & Reliability','Menguji checkout, pembayaran, file delivery, bug, dan mutu produk.',21),
('agent-ai-legal-ip','Prisma — Hukum & Kekayaan Intelektual','AI Legal & IP Counsel','Memetakan risiko hukum, merek, hak cipta, paten, privasi, dan kebutuhan ahli.',22),
('agent-ai-procurement','Rantai — Pengadaan & Vendor','AI Procurement Intelligence','Membandingkan vendor, alat, komponen, harga, dan risiko pemasok.',23)
) AS v(id,name,role,mandate,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM "agent" a WHERE a."role"=v.role);
