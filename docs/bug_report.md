# Code Audit Bug Report

## 🔴 Critical (Security & Data Loss Risk)

### BUG-01: Cookie tidak `secure` di production
**File:** [src/app/api/auth/login/route.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/auth/login/route.ts) & [register/route.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/auth/register/route.ts)
**Issue:** Cookie `auth_token` di-set dengan `secure: false` dengan komentar "VPS non-SSL support". Ini berarti cookie bisa dikirim lewat koneksi HTTP biasa, sehingga bisa dicuri lewat *man-in-the-middle attack*.
**Fix:** Ubah ke `secure: process.env.NODE_ENV === "production"` dan pastikan Nginx forwarding HTTPS ke app.
```diff
- secure: false,
+ secure: process.env.NODE_ENV === "production",
```

---

### BUG-02: OTP menggunakan `Math.random()` (tidak aman secara kriptografi)
**File:** [src/lib/otp.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/otp.ts) baris 9
**Issue:** `Math.random()` bisa diprediksi. OTP seharusnya menggunakan generator acak kriptografis.
**Fix:**
```diff
- return Math.floor(100000 + Math.random() * 900000).toString();
+ return (parseInt(require('crypto').randomBytes(3).toString('hex'), 16) % 900000 + 100000).toString();
```

---

### BUG-03: Encryption key tidak divalidasi panjangnya dengan benar
**File:** [src/lib/crypto.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/crypto.ts) baris 11–15
**Issue:** Kode print `console.error` tapi tidak melempar error, sehingga app tetap berjalan dengan default key yang lemah (`"default-32-character-encryption-key-!!"`) di production tanpa ada yang tahu.
**Fix:** Lempar exception agar startup gagal jika key tidak valid:
```diff
- console.error("FATAL: MASTER_ENCRYPTION_KEY is missing...");
+ throw new Error("FATAL: MASTER_ENCRYPTION_KEY is missing or too short in production!");
```

---

## 🟡 Medium (Logic & Reliability Bugs)

### BUG-04: Race condition di Rate Limiter
**File:** [src/lib/rate-limit.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/rate-limit.ts) baris 20–24
**Issue:** Ada jeda antara `redis.incr(key)` dan `redis.expire(key, ...)`. Jika server crash di antara keduanya, key tidak akan pernah expire dan user akan ter-block selamanya.
**Fix:** Gunakan pipeline Redis agar atomik:
```typescript
const [current] = await redis.pipeline().incr(key).expire(key, options.windowSeconds).exec();
```

---

### BUG-05: Scheduler mengabaikan timezone
**File:** [src/lib/scheduler-worker.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/scheduler-worker.ts) baris 38–49
**Issue:** Fungsi [isTimeInRange](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/scheduler-worker.ts#38-51) menggunakan waktu server lokal (`now.getHours()`), bukan timezone per-schedule yang tersimpan di kolom `timezone` (default `"Asia/Jakarta"`). Jika server berjalan di timezone UTC, jadwal akan meleset 7 jam.
**Fix:** Gunakan library seperti `date-fns-tz` atau `Intl.DateTimeFormat` untuk konversi timezone sebelum membandingkan waktu.

---

### BUG-06: WorkerManager set status `STOPPED` tapi UI expect `IDLE`
**File:** [src/lib/worker-manager.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/worker-manager.ts) baris 575 & 585
**Issue:** Ketika FFmpeg berhenti (karena [stop()](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/worker-manager.ts#674-719) atau setelah max restart), worker set status ke `"STOPPED"`. Tapi schema Prisma dan UI live session hanya mengenal status `"IDLE"`, `"LIVE"`, bukan `"STOPPED"`. Ini menyebabkan sesi yang sudah berhenti muncul dengan status undefined.
**Fix:** Ubah `"STOPPED"` → `"IDLE"` di [updateSessionStatus](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/worker-manager.ts#627-643):
```diff
- await this.updateSessionStatus(session.liveId, "STOPPED");
+ await this.updateSessionStatus(session.liveId, "IDLE");
```

---

### BUG-07: `maxScheduledSessions` menghitung SEMUA sesi, bukan yang terjadwal
**File:** [src/lib/limits.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/limits.ts) baris 151–161
**Issue:** Pengecekan limit sesi menggunakan `live_sessions.count()` tanpa filter apapun — ini menghitung semua sesi termasuk yang sudah selesai. Seharusnya menghitung sesi yang masih aktif/terjadwal saja.
**Fix:**
```diff
- const sessionCount = await (prisma as any).live_sessions.count({ where: { tenant_id: tenantId } });
+ const sessionCount = await (prisma as any).live_sessions.count({
+   where: { tenant_id: tenantId, status: { in: ["IDLE", "LIVE"] } }
+ });
```

---

### BUG-08: `upload/part` tidak memvalidasi kepemilikan video
**File:** [src/app/api/videos/upload/part/route.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/videos/upload/part/route.ts)
**Issue:** Route hanya cek [getCurrentTenantId()](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/tenant-context.ts#68-72) tapi tidak memverifikasi bahwa `video.id` yang dikirim dari client memang milik tenant tersebut. Tenant A bisa saja mengirim `video.id` milik Tenant B dan mendapat presigned URL untuk meng-overwrite file orang lain di R2.
**Fix:** Tambahkan validasi ownership:
```typescript
const videoInDb = await prisma.videos.findFirst({ where: { id: video.id, tenant_id: tenantId } });
if (!videoInDb) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### BUG-09: Registrasi membuat tenant baru dengan `storage_provider: "local"` hardcode
**File:** [src/app/api/auth/register/route.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/auth/register/route.ts) baris 83
**Issue:** Setiap tenant baru di-inisialisasi dengan `storage_provider: "local"`, yang nanti perlu diubah secara manual lewat DB atau script. Seharusnya default ke nilai dari environment variable.
**Fix:**
```diff
- storage_provider: "local",
+ storage_provider: process.env.STORAGE_PROVIDER || "local",
```

---

## 🔵 Low (Minor Issues & Tech Debt)

### BUG-10: Data limits plans duplikat antara kode dan database
**File:** [src/lib/limits.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/limits.ts) baris 15–48
**Issue:** Nilai batas plan (storage, streams, dll.) ada di dua tempat: hardcode di `PLANS` object dan juga di tabel `plans` DB. Jika admin mengubah limit di Ops Console, nilai di kode tidak ikut berubah — ini adalah fallback yang membingungkan dan bisa menyebabkan inkonsistensi.
**Fix:** Hapus object `PLANS` dan selalu baca dari DB.

---

### BUG-11: `tenant_logs` bisa menumpuk tak terbatas
**File:** [prisma/schema.prisma](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/prisma/schema.prisma) & [src/app/api/ops/logs/route.ts](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/ops/logs/route.ts)
**Issue:** Tidak ada mekanisme cleanup/retention policy untuk tabel `tenant_logs`. Di production dengan banyak error, tabel ini bisa tumbuh sangat besar dan melambatkan query.
**Fix:** Tambahkan cron job atau trigger yang menghapus log lebih dari 30/60 hari, atau batasi pengambilan data di query dengan TTL.
