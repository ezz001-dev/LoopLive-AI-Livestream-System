import Link from "next/link";
import { ArrowRight, Check, Radio, Settings2, Sparkles, Video, Waves } from "lucide-react";

const highlights = [
  {
    title: "Live Nonstop Lebih Mudah",
    description: "Putar video berulang tanpa repot dan biarkan sistem menjaga alur live tetap jalan stabil sepanjang hari.",
    icon: <Radio size={20} />,
  },
  {
    title: "Upload Sekali, Pakai Kapan Saja",
    description: "Simpan asset video dengan rapi, lalu gunakan kembali untuk sesi live berikutnya tanpa upload ulang.",
    icon: <Video size={20} />,
  },
  {
    title: "Atur Live dari Satu Tempat",
    description: "Kelola jadwal, persona AI, dan tujuan live YouTube atau TikTok dari dashboard yang simpel.",
    icon: <Settings2 size={20} />,
  },
];

const stats = [
  { label: "Platform", value: "YouTube + TikTok" },
  { label: "Asset Storage", value: "Local / R2" },
  { label: "Control Center", value: "Dashboard Web" },
];

const workflow = [
  {
    step: "01",
    title: "Upload Video",
    description: "Masukkan video ke library dan simpan dengan rapi agar siap dipakai untuk sesi live kapan saja.",
  },
  {
    step: "02",
    title: "Siapkan Sesi Live",
    description: "Pilih video, tentukan tujuan live, atur persona AI, lalu simpan sesi sesuai kebutuhan Anda.",
  },
  {
    step: "03",
    title: "Jalankan dan Pantau",
    description: "Mulai live, pantau status stream, dan biarkan workflow berjalan tanpa harus diawasi terus-menerus.",
  },
];

const featureMatrix = [
  { label: "Upload Video Langsung", status: "Ready" },
  { label: "Loop Stream Otomatis", status: "Ready" },
  { label: "Jadwal Multi Session", status: "Ready" },
  { label: "Monitoring Chat YouTube", status: "Active" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="reveal-soft flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-500/20">
              <Waves size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">LoopLive AI</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Livestream Control System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/admin"
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Open Dashboard
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="reveal-soft reveal-delay-1 mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300">
              <Sparkles size={14} />
              Bikin live lebih praktis
            </div>

            <h1 className="reveal-soft reveal-delay-2 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Kelola live stream
              <span className="block bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
                lebih simpel, stabil, dan siap jalan terus
              </span>
            </h1>

            <p className="reveal-soft reveal-delay-3 mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              LoopLive AI membantu Anda menyiapkan video, membuat sesi live, mengatur jadwal, dan menjalankan stream
              ke YouTube atau TikTok dari satu dashboard yang mudah dipahami.
            </p>

            <div className="reveal-soft reveal-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-sky-500/20 transition hover:bg-sky-400"
              >
                <span className="inline-flex items-center gap-2">
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight size={16} />
                </span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Kelola sesi live
              </Link>
            </div>

            <div className="reveal-soft reveal-delay-4 mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-lg font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal-soft reveal-delay-3 relative">
            <div className="float-glow absolute -left-10 top-12 h-28 w-28 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="float-glow absolute right-0 top-0 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">System Focus</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Semua kebutuhan live Anda, dalam satu alur kerja.</h2>
                </div>
                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300">
                  Ready
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {highlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 to-transparent p-4 transition hover:border-sky-400/30 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-sky-300">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300">Kenapa Ini Membantu</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Cocok untuk creator atau tim kecil yang ingin live lebih rapi, lebih terjadwal, dan tidak terus
                  menerus mengurus hal teknis saat stream berjalan.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="reveal-soft reveal-delay-2 pb-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Workflow Preview</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Tiga langkah sederhana sampai live berjalan</h2>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 lg:block">
              Dibuat untuk workflow berulang
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className={`reveal-soft rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm ${index === 0 ? "reveal-delay-2" : index === 1 ? "reveal-delay-3" : "reveal-delay-4"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black leading-none text-sky-300/80">{item.step}</span>
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-sky-300">
                    Stage
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal-soft reveal-delay-3 pb-8">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-sky-400/10 via-white/[0.04] to-transparent p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">System Status</p>
              <h2 className="mt-2 text-2xl font-black text-white">Ringkasan fitur inti yang siap dipakai</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Halaman ini merangkum kemampuan utama LoopLive AI untuk membantu Anda mengelola live dengan lebih tenang
                dan terstruktur.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Feature Matrix</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {featureMatrix.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">{item.label}</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                        <Check size={12} />
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="reveal-soft reveal-delay-4 pb-14">
          <div className="overflow-hidden rounded-[2rem] border border-sky-400/20 bg-gradient-to-r from-sky-400/10 via-slate-900/80 to-blue-500/10 p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300">Next Move</p>
                <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  Mulai dari langkah yang paling Anda butuhkan hari ini.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
                  Anda bisa mulai dengan upload video, membuat sesi live baru, atau merapikan pengaturan inti sebelum
                  stream dijalankan.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[640px]">
                <Link
                  href="/admin/videos"
                  className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 transition hover:border-sky-400/30 hover:bg-white/[0.1]"
                >
                  <span className="block">
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Asset</span>
                    <span className="mt-3 block text-lg font-bold text-white">Upload Video</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-400">
                      Tambahkan video baru ke library agar siap dipakai untuk live berikutnya.
                    </span>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-300">
                      <span>Open Videos</span>
                      <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>

                <Link
                  href="/admin/live"
                  className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 transition hover:border-sky-400/30 hover:bg-white/[0.1]"
                >
                  <span className="block">
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Session</span>
                    <span className="mt-3 block text-lg font-bold text-white">Create Session</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-400">
                      Buat sesi live baru, pilih video, dan tentukan tujuan stream dengan cepat.
                    </span>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-300">
                      <span>Open Live Sessions</span>
                      <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>

                <Link
                  href="/admin/settings"
                  className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 transition hover:border-sky-400/30 hover:bg-white/[0.1]"
                >
                  <span className="block">
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Config</span>
                    <span className="mt-3 block text-lg font-bold text-white">Settings</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-400">
                      Rapikan koneksi platform, AI, dan storage agar semua siap dipakai saat live.
                    </span>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-300">
                      <span>Open Settings</span>
                      <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
