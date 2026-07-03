"use client";

import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

type UserSummary = { id?: string; name?: string | null; email?: string | null; avatarUrl?: string | null; bio?: string | null };

export default function SettingsClient({ user }: { user: UserSummary }) {
  const [bio, setBio] = useState(user?.bio ?? '');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let avatarUrl = user?.avatarUrl;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        const upJson = await up.json();
        if (up.ok) avatarUrl = upJson.imageUrl ?? upJson.url ?? upJson.secure_url;
        else throw new Error(upJson.error || 'Upload failed');
      }

      const res = await fetch('/api/profile/update', { method: 'POST', body: JSON.stringify({ bio, avatarUrl }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (res.ok) toast.success('Profile saved');
      else toast.error(data.error || 'Save failed');
    } catch (_err) {
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-12">
      <Toaster />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <form onSubmit={save} className="mt-6">
          <label className="block">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full border rounded p-2 mt-2" />
          <label className="block mt-4">Avatar</label>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="mt-2" />
          <div className="mt-4">
            <button className="px-4 py-2 bg-primary text-white rounded" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
