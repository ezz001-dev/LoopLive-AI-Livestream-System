# Future Feature Roadmap Plan (LoopLive-AI)

This plan outlines the technical steps for the next major upgrades to the platform, transforming it into a more competitive AI-driven live streaming service.

## Proposed Changes

---

### Phase 29: AI Knowledge Base (RAG)
**Goal:** Allow AI to answer questions based on custom uploaded documents (e.g., product catalogs, instructions).

#### [MODIFY] [schema.prisma](file:///prisma/schema.prisma)
- Add `documents` model (tenant_id, title, content_type, size).
- Add `document_chunks` model for storing vector embeddings.

#### [NEW] [/lib/vector-store.ts](file:///src/lib/vector-store.ts)
- Utility to generate embeddings via OpenAI/Gemini.
- Cosine similarity search logic for matching prompts to document chunks.

#### [NEW] [/api/documents](file:///src/app/api/documents/route.ts)
- Endpoints for uploading and processing PDFs/Text files.

---

### Phase 30: Multi-Platform Simulcast
**Goal:** Enable streaming to multiple external RTMP servers (TikTok, YouTube, FB) simultaneously.

#### [MODIFY] [schema.prisma](file:///prisma/schema.prisma)
- Add `live_destinations` table linked to `live_sessions`.

#### [MODIFY] [worker-manager.ts](file:///src/lib/worker-manager.ts)
- Update FFmpeg command generation logic.
- Use the `tee` muxer: `ffmpeg -i input ... -f tee "[f=flv]rtmp1|[f=flv]rtmp2"`.

#### [MODIFY] [EditSessionModal.tsx](file:///src/components/admin/modals/EditSessionModal.tsx)
- UI to add/remove multiple stream keys.

---

### Phase 31: Real-time Overlay System
**Goal:** Display dynamic chat box or subscriber counts directly on the video.

#### [NEW] [/api/live/[id]/overlay](file:///src/app/api/live/overlay/route.ts)
- A dynamic HTML route that renders the "stream skin".

#### [MODIFY] [worker-manager.ts](file:///src/lib/worker-manager.ts)
- Investigate using `-f lavfi -i movie=...` or a headless browser capture to overlay HTML onto the stream.

---

### Phase 32: AI Voice Cloning
**Goal:** High-quality unique voices for each tenant.

#### [NEW] [/lib/tts-elevenlabs.ts](file:///src/lib/tts-elevenlabs.ts)
- Integration with ElevenLabs API.

#### [MODIFY] [tenant_settings](file:///prisma/schema.prisma)
- Add `elevenlabs_voice_id` and API key storage.

---

### Phase 33: AI Moderation & Auto-Engagement
**Goal:** Automated community management.

#### [MODIFY] [ai-handler](file:///src/lib/ai-handler.ts)
- Add pre-processing step to analyze chat sentiment.
- Add "Auto-Ban" logic for toxic message detection.

---

### Phase 34: Business Ops (Vouchers & Retention)
**Goal:** Monetization and growth tools.

#### [NEW] [/api/orders/vouchers](file:///src/app/api/orders/vouchers/route.ts)
- CRUD for discount codes applied during Midtrans checkout.

## Verification Plan

### Automated Tests
- Per-phase unit tests for:
    - Vector search accuracy.
    - FFmpeg command string generation for multi-output.
    - Voucher calculation logic.

### Manual Verification
- Testing multi-streaming to YouTube and TikTok test accounts.
- Verifying AI correctly answers niche questions from an uploaded PDF.
