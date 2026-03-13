"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function TourGuide() {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { 
          element: "#tour-logo", 
          popover: { 
            title: "Selamat Datang di LoopLive AI", 
            description: "Panel kontrol utama untuk sistem live streaming AI Anda. Mari kita keliling sebentar!", 
            side: "bottom", 
            align: "start" 
          } 
        },
        { 
          element: "#tour-nav-dashboard", 
          popover: { 
            title: "Dashboard Utama", 
            description: "Lihat statistik live stream, jumlah penonton, dan aktivitas terbaru Anda secara real-time.", 
            side: "right" 
          } 
        },
        { 
          element: "#tour-nav-videos", 
          popover: { 
            title: "Manajemen Video", 
            description: "Unggah file video MP4 Anda di sini. Video ini yang akan diputar secara berulang saat live.", 
            side: "right" 
          } 
        },
        { 
          element: "#tour-nav-live", 
          popover: { 
            title: "Sesi Live Streaming", 
            description: "Tempat Anda membuat sesi baru, mengatur target (YouTube/TikTok), dan melihat chat yang masuk.", 
            side: "right" 
          } 
        },
        { 
          element: "#tour-nav-settings", 
          popover: { 
            title: "Pengaturan Sistem", 
            description: "SANGAT PENTING: Masukkan API Key OpenAI/Gemini dan konfigurasi YouTube Anda di sini agar AI bisa bekerja.", 
            side: "right" 
          } 
        },
        { 
          element: "#tour-stats", 
          popover: { 
            title: "Statistik Cepat", 
            description: "Pantau kesehatan sistem Anda, mulai dari jumlah stream aktif hingga total penonton.", 
            side: "top" 
          } 
        },
        { 
          element: "#tour-recent-sessions", 
          popover: { 
            title: "Aktivitas Terbaru", 
            description: "Daftar sesi live yang baru saja Anda jalankan atau jadwalkan.", 
            side: "left" 
          } 
        },
        { 
          element: "#tour-create-session", 
          popover: { 
            title: "Mulai Sesi Baru", 
            description: "Klik tombol ini untuk membuat sesi live streaming pertama Anda!", 
            side: "left" 
          } 
        },
        { 
          element: "#start-tour-button", 
          popover: { 
            title: "Butuh Bantuan Lagi?", 
            description: "Anda bisa mengulang panduan ini kapan saja dengan mengklik tombol 'Quick Guide' ini.", 
            side: "bottom" 
          } 
        },
      ],
      nextBtnText: "Lanjut",
      prevBtnText: "Kembali",
      doneBtnText: "Selesai",
    });

    const handleStartTour = () => {
      driverObj.drive();
    };

    const tourBtn = document.getElementById("start-tour-button");
    if (tourBtn) {
      tourBtn.addEventListener("click", handleStartTour);
    }

    // Auto-start tour for new users (optional, can be stored in localStorage)
    const hasSeenTour = localStorage.getItem("has_seen_tour");
    if (!hasSeenTour) {
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        driverObj.drive();
        localStorage.setItem("has_seen_tour", "true");
      }, 1500);
    }

    return () => {
      if (tourBtn) {
        tourBtn.removeEventListener("click", handleStartTour);
      }
    };
  }, []);

  return null;
}
