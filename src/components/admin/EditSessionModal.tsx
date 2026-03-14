"use client";

import { useState, useEffect } from "react";
import { Edit2, Save, X, Youtube, Clock, Calendar, Repeat, Plus, Trash2 } from "lucide-react";

interface EditSessionModalProps {
  sessionId: string;
  initialData: {
    title: string;
    youtube_video_id: string | null;
    youtube_channel_id: string | null;
    target_rtmp_url: string | null;
    stream_key: string | null;
    loop_mode?: string | null;
    loop_count?: number | null;
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

  // Multi-schedule state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    schedule_type: 'one-time',
    scheduled_at: '',
    scheduled_end_at: '',
    days_of_week: [] as string[],
    start_time: '',
    end_time: '',
    timezone: 'Asia/Jakarta',
    active: true,
    repeat_end_date: '',
  });

  function applyPlatformPreset(platform: "youtube" | "tiktok") {
    setFormData({
      ...formData,
      target_rtmp_url:
        platform === "youtube"
          ? "rtmp://a.rtmp.youtube.com/live2"
          : "rtmp://push-rtmp-global.tiktok.com/live/",
    });
  }

  // Load schedules on mount
  useEffect(() => {
    loadSchedules();
  }, [sessionId]);

  async function loadSchedules() {
    setLoadingSchedules(true);
    try {
      const res = await fetch(`/api/live/${sessionId}/schedule`);
      const data = await res.json();
      if (data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  }

  async function handleAddSchedule() {
    try {
      // Validation: Start time cannot be in the past for one-time schedules
      if (newSchedule.schedule_type === 'one-time' && newSchedule.scheduled_at) {
        const scheduledDate = new Date(newSchedule.scheduled_at);
        const now = new Date();
        // Allow up to 2 minutes in the past for "now" support
        if (scheduledDate.getTime() < now.getTime() - (2 * 60 * 1000)) {
          throw new Error('Start time cannot be in the past');
        }
      }

      const submitData: any = {
        schedule_type: newSchedule.schedule_type,
        timezone: newSchedule.timezone,
        active: newSchedule.active,
      };

      if (newSchedule.schedule_type === 'one-time') {
        submitData.scheduled_at = newSchedule.scheduled_at;
        if (newSchedule.scheduled_end_at) {
          submitData.scheduled_end_at = newSchedule.scheduled_end_at;
        }
      } else {
        submitData.days_of_week = newSchedule.days_of_week;
        submitData.start_time = newSchedule.start_time;
        submitData.end_time = newSchedule.end_time;
        if (newSchedule.repeat_end_date) {
          submitData.repeat_end_date = newSchedule.repeat_end_date;
        }
      }

      const res = await fetch(`/api/live/${sessionId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) throw new Error('Failed to add schedule');

      // Update local state to show schedule as enabled
      setFormData(prev => ({ ...prev, schedule_enabled: true }));
      setShowSchedule(true);

      await loadSchedules();
      setShowAddSchedule(false);
      setNewSchedule({
        schedule_type: 'one-time',
        scheduled_at: '',
        scheduled_end_at: '',
        days_of_week: [],
        start_time: '',
        end_time: '',
        timezone: 'Asia/Jakarta',
        active: true,
        repeat_end_date: '',
      });
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Delete this schedule?')) return;
    try {
      const res = await fetch(`/api/live/${sessionId}/schedule/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
      
      // If no schedules left, the API might have disabled schedule_enabled
      if (schedules.length <= 1) {
        setFormData(prev => ({ ...prev, schedule_enabled: false }));
        setShowSchedule(false);
      }
      
      await loadSchedules();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUpdateScheduleActive(scheduleId: string, active: boolean) {
    try {
      const res = await fetch(`/api/live/${sessionId}/schedule/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error('Failed to update schedule');
      await loadSchedules();
    } catch (err: any) {
      setError(err.message);
    }
  }

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
      if (submitData.loop_mode !== "count") {
        submitData.loop_count = null;
      } else {
        const parsedLoopCount = Number(submitData.loop_count);
        if (!Number.isInteger(parsedLoopCount) || parsedLoopCount <= 0) {
          throw new Error("Loop count harus berupa angka lebih besar dari 0.");
        }
        submitData.loop_count = parsedLoopCount;
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
            <label htmlFor="session-title" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Session Title
            </label>
            <input
              id="session-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="youtube-video-id" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Youtube size={14} />
              YouTube Video ID
            </label>
            <input
              id="youtube-video-id"
              type="text"
              value={formData.youtube_video_id || ""}
              onChange={(e) => setFormData({ ...formData, youtube_video_id: e.target.value || null })}
              placeholder="e.g., dQw4w9WgXcQ"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors font-mono text-sm"
            />
            <p className="text-slate-500 text-xs mt-1">
              Update this when your YouTube live stream ID changes. This field only affects chat polling.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rtmp-url" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Target RTMP URL
              </label>
              <input
                id="rtmp-url"
                type="text"
                value={formData.target_rtmp_url || ""}
                onChange={(e) => setFormData({ ...formData, target_rtmp_url: e.target.value || null })}
                placeholder="rtmp://a.rtmp.youtube.com/live2"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPlatformPreset("youtube")}
                  className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/20"
                >
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => applyPlatformPreset("tiktok")}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  TikTok
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="stream-key" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Stream Key
              </label>
              <input
                id="stream-key"
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
              Video Loop Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, loop_mode: "infinite", loop_count: null })}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  (formData.loop_mode || "infinite") === "infinite"
                    ? "border-blue-500 bg-blue-500/20 text-white"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
                }`}
              >
                Infinite
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    loop_mode: "count",
                    loop_count: formData.loop_count && formData.loop_count > 0 ? formData.loop_count : 2,
                  })
                }
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  formData.loop_mode === "count"
                    ? "border-blue-500 bg-blue-500/20 text-white"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600"
                }`}
              >
                Berdasarkan Jumlah
              </button>
            </div>
            {formData.loop_mode === "count" && (
              <div className="mt-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.loop_count || 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      loop_count: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
                  placeholder="Contoh: 2"
                />
                <p className="text-slate-500 text-xs mt-2">
                  Nilai 2 berarti video diputar total 2 kali.
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="ai-context" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              AI Context
            </label>
            <textarea
              id="ai-context"
              value={formData.context_text || ""}
              onChange={(e) => setFormData({ ...formData, context_text: e.target.value || null })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors text-sm resize-none"
              placeholder="Context for AI responses..."
            />
          </div>

          <div>
            <label htmlFor="ai-tone" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              AI Tone
            </label>
            <select
              id="ai-tone"
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
                    {schedules.length > 0 ? `${schedules.length} Active` : 'Enabled'}
                  </span>
                )}
                <div className={`w-11 h-6 rounded-full relative transition-colors ${formData.schedule_enabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-[2px] h-5 w-5 bg-white rounded-full transition-all ${formData.schedule_enabled ? 'left-[22px]' : 'left-[2px]'}`}></div>
                </div>
              </div>
            </button>

            {showSchedule && formData.schedule_enabled && (
              <div className="mt-4 space-y-4 p-4 bg-slate-800/30 rounded-xl">
                {/* Multi-Schedule Display */}
                {schedules.length > 0 && (
                  <div className="mb-4">
                    <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                      Active Schedules ({schedules.length})
                    </span>
                    <div className="space-y-2">
                      {schedules.map((schedule: any) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${schedule.schedule_type === 'one-time' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                {schedule.schedule_type === 'one-time' ? 'One-time' : 'Repeat'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${schedule.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                                {schedule.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-white text-sm mt-1">
                              {schedule.schedule_type === 'one-time'
                                ? (
                                  <>
                                    {schedule.scheduled_at ? new Date(schedule.scheduled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}
                                    {schedule.scheduled_end_at && (
                                      <span className="text-slate-500 mx-2">to</span>
                                    )}
                                    {schedule.scheduled_end_at && new Date(schedule.scheduled_end_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </>
                                )
                                : `${schedule.start_time} - ${schedule.end_time}`
                              }
                            </p>
                            {schedule.schedule_type === 'repeat' && schedule.days_of_week && (
                              <p className="text-slate-400 text-xs mt-1">
                                Days: {Array.isArray(schedule.days_of_week) ? schedule.days_of_week.join(', ') : JSON.parse(schedule.days_of_week).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateScheduleActive(schedule.id, !schedule.active)}
                              className={`p-2 rounded-lg transition-colors ${schedule.active ? 'text-green-400 hover:bg-green-500/20' : 'text-slate-400 hover:bg-slate-700'}`}
                              title={schedule.active ? 'Disable' : 'Enable'}
                            >
                              {schedule.active ? '⏸️' : '▶️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Schedule Button */}
                {!showAddSchedule ? (
                  <button
                    type="button"
                    onClick={() => setShowAddSchedule(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-400 rounded-xl transition-colors"
                  >
                    <Plus size={18} />
                    Add New Schedule Entry
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-slate-900 rounded-xl border border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium">New Schedule Entry</h4>
                      <button type="button" onClick={() => setShowAddSchedule(false)} className="text-slate-400 hover:text-white">
                        <X size={18} />
                      </button>
                    </div>

                    {/* Schedule Type */}
                    <div>
                      <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Schedule Type
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewSchedule({ ...newSchedule, schedule_type: 'one-time' })}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${newSchedule.schedule_type === 'one-time'
                              ? 'border-purple-500 bg-purple-500/20 text-white'
                              : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                          <Calendar size={16} />
                          One-time
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewSchedule({ ...newSchedule, schedule_type: 'repeat' })}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${newSchedule.schedule_type === 'repeat'
                              ? 'border-purple-500 bg-purple-500/20 text-white'
                              : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                          <Repeat size={16} />
                          Repeat
                        </button>
                      </div>
                    </div>

                    {newSchedule.schedule_type === 'one-time' ? (
                      /* One-time Schedule */
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="scheduled-at" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                              Start Date & Time
                            </label>
                            <input
                              id="scheduled-at"
                              type="datetime-local"
                              value={newSchedule.scheduled_at}
                              onChange={(e) => setNewSchedule({ ...newSchedule, scheduled_at: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label htmlFor="scheduled-end-at" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                              End Date & Time
                            </label>
                            <input
                              id="scheduled-end-at"
                              type="datetime-local"
                              value={newSchedule.scheduled_end_at}
                              onChange={(e) => setNewSchedule({ ...newSchedule, scheduled_end_at: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                            />
                          </div>
                        </div>
                    ) : (
                      /* Repeat Schedule */
                      <div className="space-y-4">
                        {/* Days of Week */}
                        <div>
                          <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                            Days of Week
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                              const isSelected = newSchedule.days_of_week.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const newDays = isSelected
                                      ? newSchedule.days_of_week.filter(d => d !== day)
                                      : [...newSchedule.days_of_week, day];
                                    setNewSchedule({ ...newSchedule, days_of_week: newDays });
                                  }}
                                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${isSelected
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
                            <label htmlFor="start-time" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                              Start Time
                            </label>
                            <input
                              id="start-time"
                              type="time"
                              value={newSchedule.start_time}
                              onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label htmlFor="end-time" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                              End Time
                            </label>
                            <input
                              id="end-time"
                              type="time"
                              value={newSchedule.end_time}
                              onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        {/* Timezone */}
                        <div>
                          <label htmlFor="timezone" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                            Timezone
                          </label>
                          <select
                            id="timezone"
                            value={newSchedule.timezone}
                            onChange={(e) => setNewSchedule({ ...newSchedule, timezone: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm"
                          >
                            <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                            <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                            <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                            <option value="UTC">UTC</option>
                          </select>
                        </div>

                        {/* Repeat End Date */}
                        <div>
                          <label htmlFor="repeat-end-date" className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                            Repeat Until (Optional)
                          </label>
                          <input
                            id="repeat-end-date"
                            type="date"
                            value={newSchedule.repeat_end_date}
                            onChange={(e) => setNewSchedule({ ...newSchedule, repeat_end_date: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors text-sm [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddSchedule}
                      disabled={newSchedule.schedule_type === 'one-time' && !newSchedule.scheduled_at}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Add Schedule Entry
                    </button>
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
