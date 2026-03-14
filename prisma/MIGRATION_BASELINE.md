# Prisma Migration Baseline

Repo ini sempat hanya memiliki migration lanjutan:

- `20260313_add_video_storage_fields`
- `20260314_add_live_session_loop_settings`

Akibatnya, `prisma migrate dev` gagal pada shadow database karena migration pertama mencoba `ALTER TABLE "videos"` sebelum tabel dasar pernah dibuat.

## Solusi yang Dipakai

Ditambahkan baseline migration:

- `20260312_initial_baseline`

Migration ini membuat schema dasar sebelum perubahan storage video dan loop session ditambahkan. Dengan urutan ini:

1. `20260312_initial_baseline`
2. `20260313_add_video_storage_fields`
3. `20260314_add_live_session_loop_settings`

shadow database sekarang memiliki histori yang lengkap.

## Untuk Database yang Sudah Ada

Kalau database Anda sudah terlanjur memiliki semua tabel dari setup lama, jangan jalankan baseline migration mentah-mentah ke DB itu.

Langkah yang aman:

1. sinkronkan schema ke DB aktif:

```bash
npx prisma db push
```

2. generate Prisma client:

```bash
npx prisma generate
```

3. tandai migration sebagai applied jika nanti Anda ingin merapikan histori migration table:

```bash
npx prisma migrate resolve --applied 20260312_initial_baseline
npx prisma migrate resolve --applied 20260313_add_video_storage_fields
npx prisma migrate resolve --applied 20260314_add_live_session_loop_settings
```

Gunakan `migrate resolve` hanya jika Anda yakin schema DB aktif memang sudah setara dengan hasil migration tersebut.

## Untuk Database Baru / Shadow DB

Database baru sekarang bisa memakai:

```bash
npx prisma migrate dev
```

atau:

```bash
npx prisma migrate deploy
```

tanpa error `table does not exist` pada shadow database.
