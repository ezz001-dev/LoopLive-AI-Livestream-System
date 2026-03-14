# Task Implementasi File-by-File

## Tujuan

Memecah implementasi sound effect + TTS + ducking menjadi langkah kerja yang konkret per file.

## Tahap 1: Pondasi Audio Queue

### File Baru

#### `src/lib/audio-event-manager.ts`

Task:

- buat queue in-memory per `liveId`
- buat API dasar:
  - `enqueueAudioEvent`
  - `peekAudioEvent`
  - `shiftAudioEvent`
  - `clearAudioQueue`
  - `hasPendingAudioEvent`
- tambahkan log debug sederhana

Output:

- manager queue siap dipakai worker dan trigger event

## Tahap 2: Trigger Sound Effect ke Queue

### File Existing

#### `src/lib/socket-server.ts`

Task:

- saat keyword sound match, selain emit `play_sound` ke browser:
  - enqueue sound event ke `audio-event-manager`
- tetap pertahankan emit browser untuk preview/debug
- tambahkan log:
  - enqueue berhasil
  - queue length
  - liveId

Output:

- komentar YouTube/internal bisa mendorong sound effect ke queue server-side

## Tahap 3: TTS ke Queue

### File Existing

#### `src/lib/ai-worker.ts`

Task:

- pertahankan rule `skip TTS jika keyword sound aktif`
- saat TTS boleh dipakai:
  - AI worker tetap publish request TTS seperti sekarang
- tambahkan metadata jika perlu agar session worker tahu event ini jenis `tts`

Output:

- keputusan AI/TTS tetap rapi dan tidak dobel dengan keyword sound

#### `src/lib/tts-worker.ts`

Task:

- setelah file TTS berhasil dibuat:
  - selain publish `ai_audio_ready` ke socket
  - enqueue file TTS ke `audio-event-manager`
- tambahkan log enqueue

Output:

- file TTS siap dipakai worker untuk masuk ke stream

## Tahap 4: Integrasi Worker dengan Audio Queue

### File Existing

#### `src/lib/worker-manager.ts`

Task:

- simpan state audio queue per session
- tambahkan mekanisme polling atau checking event audio aktif
- siapkan `currentAudioEvent` per session
- rancang lifecycle:
  - idle
  - event queued
  - event playing
  - event finished

Output:

- worker aware terhadap event audio session

## Tahap 5: Mixing Audio ke FFmpeg

### File Existing

#### `src/lib/worker-manager.ts`

Task:

- ubah command FFmpeg agar bisa menerima audio event tambahan
- tambahkan `filter_complex` untuk:
  - mix audio utama
  - ducking audio utama saat event aktif
- mulai dari profil sederhana:
  - satu event audio aktif pada satu waktu
  - satu input audio tambahan

Output:

- sound effect atau TTS mulai terdengar di live platform

## Tahap 6: Event Lifecycle

### File Baru / Existing

#### `src/lib/audio-event-manager.ts`

Task:

- tandai event selesai
- ambil event berikutnya jika queue masih ada
- clear queue saat session stop

#### `src/lib/worker-manager.ts`

Task:

- sinkronkan lifecycle event dengan worker stop/restart
- pastikan restart worker tidak meninggalkan queue rusak

Output:

- queue audio tetap stabil walau session stop/restart

## Tahap 7: Configurability

### File Existing

#### `.env.example`

Task:

- tambahkan env baru untuk audio mix:
  - `STREAM_AUDIO_DUCKING_ENABLED`
  - `STREAM_AUDIO_DUCKING_LEVEL`
  - `STREAM_AUDIO_EVENT_GAIN`
  - `STREAM_AUDIO_MAIN_GAIN`

#### `src/lib/worker-manager.ts`

Task:

- baca env di atas
- terapkan ke parameter mixing

Output:

- ducking bisa dituning tanpa edit code

## Tahap 8: UI dan Debug

### File Existing

#### `src/components/admin/ClientSessionPage.tsx`

Task:

- pertahankan playback browser sebagai preview/debug
- tambahkan status kecil jika audio event sedang di-trigger

#### `src/app/live/[id]/page.tsx`

Task:

- tetap gunakan preview browser untuk validasi event lokal
- jelaskan bahwa audio ini juga sedang diproses ke stream server-side jika mode baru aktif

Output:

- lebih mudah debug apakah event hanya sampai browser atau sudah masuk stream

## Tahap 9: Optional Schema Upgrade

### File Existing

#### `prisma/schema.prisma`

Task opsional:

- tambahkan field pada `sound_events`:
  - `priority`
  - `skip_tts`
  - `cooldown_seconds`
  - `volume_gain`

Output:

- sound event lebih fleksibel untuk jangka panjang

## Urutan Implementasi yang Disarankan

1. `src/lib/audio-event-manager.ts`
2. `src/lib/socket-server.ts`
3. `src/lib/tts-worker.ts`
4. `src/lib/worker-manager.ts`
5. `.env.example`
6. `src/components/admin/ClientSessionPage.tsx`
7. `src/app/live/[id]/page.tsx`
8. `prisma/schema.prisma` bila diperlukan

## Definition of Done Tahap Awal

Implementasi tahap awal dianggap berhasil jika:

- komentar keyword memicu sound effect
- sound effect masuk ke queue server-side
- FFmpeg memasukkan sound effect ke stream
- audio video utama turun sementara
- setelah sound selesai, audio kembali normal
- TTS tidak ikut diputar jika keyword sound aktif
