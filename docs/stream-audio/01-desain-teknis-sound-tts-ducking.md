# Desain Teknis Sound Effect + TTS + Ducking

## Tujuan

Saat live ke YouTube atau TikTok:

- video loop tetap berjalan
- komentar bisa memicu sound effect
- AI reply bisa diputar sebagai TTS
- audio video utama turun sementara saat sound effect atau TTS aktif
- setelah event audio selesai, volume audio utama kembali normal
- jika komentar sudah memicu sound effect, TTS tidak perlu ikut diputar

## Kondisi Saat Ini

Saat ini sound effect dan TTS hanya diputar di browser preview lewat socket event:

- `play_sound`
- `ai_voice_play`

Artinya:

- viewer internal preview bisa mendengar audio event
- penonton YouTube/TikTok belum mendengar audio event

## Target Arsitektur

Ubah jalur audio menjadi:

1. komentar masuk dari YouTube/TikTok
2. sistem menentukan apakah komentar memicu:
   - sound effect
   - TTS
   - atau TTS di-skip karena sound effect aktif
3. file audio event dimasukkan ke queue per session
4. worker session mencampur audio utama video dengan audio event
5. FFmpeg menerapkan ducking
6. output RTMP ke platform sudah berisi suara interaksi

## Komponen Utama

### 1. Audio Event Queue per Session

Queue sederhana per `liveId` yang menyimpan event audio yang akan diputar.

Contoh struktur item:

```ts
type AudioEvent = {
  id: string;
  liveId: string;
  type: "sound" | "tts";
  audioPath: string;
  createdAt: number;
  priority?: number;
};
```

### 2. Audio Event Manager

Komponen baru untuk:

- enqueue event audio
- mengambil event aktif
- menandai event selesai
- menghindari overlap berlebihan

### 3. Worker Audio Pipeline

Worker FFmpeg tidak hanya mengirim video loop, tetapi juga harus:

- membaca audio utama dari file video
- membaca audio event aktif
- mencampur keduanya
- menurunkan volume audio utama saat event audio aktif

## Pendekatan Implementasi

## Opsi yang Dipilih: Pendekatan Cepat

Gunakan file audio event sementara per session dan queue sederhana.

Alur:

- sound effect atau TTS menghasilkan path file audio
- path itu dimasukkan ke queue per session
- worker memakai file audio event aktif sebagai input audio tambahan
- FFmpeg mix audio utama + audio event

Kelebihan:

- paling realistis untuk codebase saat ini
- perubahan lebih terlokalisasi
- tidak perlu membuat media server baru

Kekurangan:

- masih sederhana
- queue dan timing event perlu dikontrol hati-hati
- kurang cocok untuk skala besar tanpa refactor lanjutan

## Aturan Interaksi

### Rule Dasar

1. Jika komentar cocok dengan keyword sound effect aktif:
   - sound effect dipicu
   - TTS di-skip
2. Jika komentar tidak cocok dengan keyword sound effect:
   - AI reply dihasilkan
   - TTS dipicu
3. Saat sound effect atau TTS aktif:
   - audio utama video diturunkan sementara
4. Setelah event audio selesai:
   - audio utama kembali normal

## Kebutuhan FFmpeg

Secara konsep, FFmpeg perlu:

- input video utama
- input audio event tambahan
- mixing audio
- ducking audio utama berdasarkan audio event

Filter yang relevan:

- `sidechaincompress`
- `amix`
- `volume`

Pendekatan awal yang disarankan:

- ducking dengan `sidechaincompress`
- event audio sebagai trigger
- audio utama tetap menjadi base layer

## State Runtime yang Dibutuhkan

Per session, worker perlu menyimpan:

- `liveId`
- `videoInput`
- `streamUrl`
- `audioQueue`
- `currentAudioEvent`
- `isEventPlaying`
- `ffmpegProcess`
- `manualStop`

## Alur Runtime

### Contoh 1: Keyword Sound

1. Viewer komentar `hallo`
2. Poller menangkap komentar
3. Sistem mendeteksi keyword sound `hallo`
4. File `/sounds/...mp3` di-enqueue
5. TTS di-skip
6. Worker mencampur sound effect ke stream
7. Audio video utama turun sementara
8. Sound effect selesai
9. Audio utama kembali normal

### Contoh 2: TTS Biasa

1. Viewer komentar biasa
2. AI reply dibuat
3. TTS worker menghasilkan file `/audio/...mp3`
4. File TTS di-enqueue
5. Worker mencampur TTS ke stream
6. Audio video utama turun sementara
7. TTS selesai
8. Audio utama kembali normal

## Logging yang Disarankan

Tambahkan log terstruktur untuk:

- audio event di-enqueue
- audio event aktif mulai diputar
- audio event selesai
- TTS di-skip karena keyword sound
- FFmpeg mix profile aktif
- error saat audio event file tidak ditemukan

## Risiko

- event bertumpuk terlalu cepat
- audio file belum siap saat worker ingin memutar
- FFmpeg mix lebih sensitif daripada stream biasa
- CPU dan kompleksitas runtime naik

## Rekomendasi Tahapan

### Phase 1

- queue sound effect saja
- TTS tetap browser/local atau sementara di-skip
- ducking fixed sederhana

### Phase 2

- TTS masuk ke stream
- skip TTS saat keyword sound aktif

### Phase 3

- priority queue
- cooldown keyword
- multiple event handling lebih rapi

### Phase 4

- refactor ke mekanisme audio injection yang lebih proper untuk SaaS

## Kesimpulan

Solusi tercepat dan paling realistis untuk codebase ini adalah:

- membuat audio queue per session
- mencampur audio event di worker server-side
- menerapkan ducking di jalur FFmpeg

Dengan desain ini, sound effect dan TTS tidak lagi hanya terdengar di preview browser, tetapi ikut masuk ke live platform.
