"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import CreateSessionModal from "./CreateSessionModal";

export default function LiveSessionsHeader() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
      >
        <Plus size={18} />
        Create New Session
      </button>

      {showModal && <CreateSessionModal onClose={() => setShowModal(false)} />}
    </>
  );
}
