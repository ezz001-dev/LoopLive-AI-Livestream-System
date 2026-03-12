"use client";

import { useState } from "react";
import { Edit2, Save, X, Youtube, Clock, Calendar, Repeat } from "lucide-react";

interface EditSessionModalProps {
  sessionId: string;
  initialData: {
    title: string;
    youtube_video_id: string | null;
    youtube_channel_id: string | null;
    target_rtmp_url: string | null;
    stream_key: string | null;
    context_text: string | null;
    ai_tone: string;
    // Schedule fields
    schedule_enabled: boolean;
    schedule_type: string;
    schedule_start_at: Date | null;
    schedule_end_at: Date | null;
    schedule_days: string | null;
    schedule_start_time: string | null;
    schedule_end_time: string | null;
    schedule_timezone: string;
    schedule_repeat_end: Date | null;
  };
  onClose: () => void;
  onSave: () => void;
}

export default function EditSessionModal({ sessionId, initialData, onClose, onSave }: EditSessionModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(initialData.schedule_enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Prepare data - convert Date objects to ISO strings for API
      const submitData: any = { ...formData };
      if (submitData.schedule_start_at instanceof Date) {
        submitData.schedule_start_at = submitData.schedule_start_at.toISOString();
      }
      if (submitData.schedule_end_at instanceof Date) {
        submitData.schedule_end_at = submitData.schedule_end_at.toISOString();
      }
      if (submitData.schedule_repeat_end instanceof Date) {
        submitData.schedule_repeat_end = submitData.schedule_repeat_end.toISOString();
      }
      // Convert schedule_days from JSON string to array for API
      if (submitData.schedule_days && typeof submitData.schedule_days === 'string') {
        try {
          submitData.schedule_days = JSON.parse(submitData.schedule_days);
        } catch {
          // already an array or invalid, leave as is
        }
      }

      const response = await fetch(`/api/live/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update session");
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper to format Date for datetime-local input
  const formatDateTimeLocal = (date: Date | string | null): string => {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      // Adjust for local timezone
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      return local.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  // Helper to format Date for date input
  const formatDateInput = (date: Date | string | null): string => {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Helper to get parsed days array
  const getParsedDays = (): string[] => {
    if (!formData.schedule_days) return [];
    try {
      return JSON.parse(formData.schedule_days);
    } catch {
      return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit2 size={20} className="text-blue-400" />
            Edit Session
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Session Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Youtube size={14} />
              YouTube Video ID
            </label>
            <input
              type="text"
              value={formData.youtube_video_id || ""}
              onChange={(e) => setFormData({ ...formData, youtube_video_id: e.target.value || null })}
              placeholder="e.g., dQw4w9WgXcQ"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors font-mono text-sm"
            />
            <p className="text-slate-500 text-xs mt-1">
              Update this when your YouTube live stream ID changes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                RTMP URL
              </label>
              <input
                type="text"
                value={formData.target_rtmp_url || ""}
                onChange={(e) => setFormData({ ...formData, target_rtmp_url: e.target.value || null })}
                placeholder="rtmp://a.rtmp.youtube.com/live2"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Stream Key
              </label>
              <input
                type="text"
                value={formData.stream_key || ""}
                onChange={(e) => setFormData({ ...formData, stream_key: e.target.value || null })}
                placeholder="your-stream-key"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              AI Context
            </label>
            <textarea
              value={formData.context_text || ""}
              onChange={(e) => setFormData({ ...formData, context_text: e.target.value || null })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors text-sm resize-none"
              placeholder="Context for AI responses..."
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              AI Tone
            </label>
            <select
              value={formData.ai_tone}
              onChange={(e) => setFormData({ ...formData, ai_tone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="humor">Humorous</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          {/* ─── Schedule Section ─── */}
          <div className="border-t border-slate-800 pt-4 mt-4">
            <button
              type="button"
              onClick={() => {
                const newEnabled = !formData.schedule_enabled;
                setFormData({ ...formData, schedule_enabled: newEnabled });
                setShowSchedule(newEnabled);
              }}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2 text-white font-medium">
                <Clock size={18} className="text-purple-400" />
                <span>Schedule</span>
              </div>
              <div className="flex items-center gap-3">
                {formData.schedule_enabled && (
                  <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                    {formData.schedule_type === 'one-time' ? 'One-time' : 'Repeat'}
                  </span>
                )}
                <div className={`w-11 h-6 rounded-full relative transition-colors ${formData.schedule_enabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-[2px] h-5 w-5 bg-white rounded-full transition-all ${formData.schedule_enabled ? 'left-[22px]' : 'left-[2px]'}`}></div>
                </div>
              </div>
            </button>

            {showSchedule && formData.schedule_enabled && (
              <div className="mt-4 space-y-4 p-4 bg-slate-800/30 rounded-xl">
                {/* Schedule Type */}
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Schedule Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, schedule_type: 'one-time' })}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                        formData.schedule_type === 'one-time'
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Calendar size={16} />
                      One-time
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, schedule_type: 'repeat' })}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                        formData.schedule_type === 'repeat'
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Repeat size={16} />
                      Repeat
                    </button>
                  </div>
                </div>

                {formData.schedule_type === 'one-time' ? (
                  /* One-time Schedule */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateTimeLocal(formData.schedule_start_at)}
                        onChange={(e) => setFormData({ ...formData, schedule_start_at: e.target.value ? new Date(e.target.value) : null })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formatDateTimeLocal(formData.schedule_end_at)}
                        onChange={(e) => setFormData({ ...formData, schedule_end_at: e.target.value ? new Date(e.target.value) : null })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                      />
                    </div>
                  </div>
                ) : (
                  /* Repeat Schedule */
                  <div className="space-y-4">
                    {/* Days of Week */}
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Days of Week
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                          const days = getParsedDays();
                          const isSelected = days.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const currentDays = getParsedDays();
                                const newDays = isSelected
                                  ? currentDays.filter((d: string) => d !== day)
                                  : [...currentDays, day];
                                setFormData({ ...formData, schedule_days: JSON.stringify(newDays) });
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={formData.schedule_start_time || ''}
                          onChange={(e) => setFormData({ ...formData, schedule_start_time: e.target.value || null })}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={formData.schedule_end_time || ''}
                          onChange={(e) => setFormData({ ...formData, schedule_end_time: e.target.value || null })}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.schedule_timezone}
                        onChange={(e) => setFormData({ ...formData, schedule_timezone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm"
                      >
                        <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                        <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                        <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    {/* Repeat End Date (Optional) */}
                    <div>
                      <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Repeat Until (Optional)
                      </label>
                      <input
                        type="date"
                        value={formatDateInput(formData.schedule_repeat_end)}
                        onChange={(e) => setFormData({ ...formData, schedule_repeat_end: e.target.value ? new Date(e.target.value) : null })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                      />
                      <p className="text-slate-500 text-xs mt-1">
                        Leave empty for indefinite repeat
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
