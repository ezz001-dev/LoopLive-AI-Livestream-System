# Panduan Penguna LoopLive AI 🚀

Selamat datang di LoopLive AI! Aplikasi ini membantu Anda melakukan live streaming 24/7 dengan bantuan Kecerdasan Buatan (AI) yang bisa menyapa dan mengobrol dengan penonton Anda secara otomatis.

Berikut adalah langkah-langkah mudah untuk memulai:

---

## 1. Persiapan Awal (Hanya Sekali)
Sebelum memulai live, Anda perlu mengisi "Kunci" agar AI bisa bekerja.

1.  Masuk ke menu **Settings** di samping kiri.
2.  Pilih tab **API Keys**.
3.  Masukkan kunci dari **OpenAI** atau **Google Gemini** (ini seperti memberi 'pulsa' agar AI bisa berpikir).
4.  Klik **Save Changes**.

---

## 2. Mengunggah Video
Sistem ini memutar video yang sudah Anda siapkan secara berulang (loop).

1.  Klik menu **Videos**.
2.  Klik tombol **Upload Video**.
3.  Pilih file video (`.mp4`) dari komputer Anda.
4.  Setelah selesai, video akan muncul di daftar dan siap digunakan.

---

## 3. Membuat Sesi Live Pertama
Sekarang saatnya mengatur live streaming Anda.

1.  Masuk ke menu **Live Sessions**.
2.  Klik tombol **Create New Session**.
3.  Isi data berikut:
    -   **Title**: Judul untuk catatan Anda.
    -   **Select Video**: Pilih video yang sudah diunggah tadi.
    -   **Context (Penting)**: Tuliskan tentang apa live Anda, agar AI tahu cara menjawab penonton (Contoh: "Live jualan baju daster, harga mulai 50rb").
    -   **AI Tone**: Pilih gaya bicara AI (Ramah, Enerjik, atau Lucu).
4.  **Target Perangkat** (Opsional): Jika ingin live ke YouTube/TikTok, masukkan URL dan Kunci Stream yang Anda dapat dari platform tersebut.

---

## 4. Memulai Live Chat
Agar AI bisa membalas chat penonton di YouTube secara otomatis:

1.  Buka **Settings** -> **Stream Settings**.
2.  Masukkan **YouTube Handle** Anda (Contoh: `@namakanaLanda`).
3.  Jika live Anda bersifat pribadi/terbatas, tempelkan **YouTube Cookie** di kolom yang tersedia.
4.  Sistem akan otomatis mendeteksi live Anda dan mulai membalas chat penonton.

---

## 5. Fitur Seru: Suara Sapaan (Sound Events)
Anda bisa membuat aplikasi memutar bunyi tertentu saat ada kejadian khusus.

1.  Buka **Settings** -> **Sound Events**.
2.  Anda bisa menambahkan suara untuk:
    -   **Keyword**: Misal saat penonton mengetik "halo", aplikasi otomatis memutar suara sapaan Anda.
    -   **Join**: Saat ada orang baru masuk, aplikasi menyetel suara musik atau salam.
3.  Unggah file suaranya dan simpan.

---

## 6. Menjadwalkan Live Otomatis
Ingin live berjalan sendiri saat Anda tidur?

1.  Di menu **Live Sessions**, klik tombol **Edit (Ikon Pensil)** pada sesi Anda.
2.  Klik **Add Schedule**.
3.  Pilih hari dan jam kapan live harus **Mulai** dan kapan harus **Berhenti**.
4.  Jangan lupa aktifkan tombol **Schedule Enabled**.

---

## 7. Tips Tambahan
-   **Dashboard**: Pantau jumlah penonton dan status live Anda di halaman utama.
-   **Public Page**: Berikan link live Anda (biasanya `localhost:3000/live/[id]`) agar orang lain bisa menonton langsung dari aplikasi Anda.
-   **AI Persona**: Anda bisa mengubah sifat AI di menu **Settings -> AI Identity** (Misal: "Jadilah asisten yang sopan dan selalu memanggil penonton dengan sebutan Kakak").

---

Jika ada kendala, pastikan koneksi internet stabil dan "Kunci API" Anda masih berlaku! Selamat mencoba! 🎉
