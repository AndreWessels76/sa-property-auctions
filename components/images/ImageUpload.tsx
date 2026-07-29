"use client";

import { useState } from "react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { saveImage } from "@/lib/images/imageService";
import { uploadPropertyImage } from "@/lib/images/storage";
import { ROLES } from "@/lib/permissions/roles";
import { refreshPropertyCache } from "@/lib/services/actions";

type Props = {
  propertyId: string;
  source?: string;
};

/**
 * Admin-only upload control. Do not mount on public property pages.
 * Storage RLS must also deny anonymous writes in Supabase.
 */
export default function ImageUpload({
  propertyId,
  source = "Sheriff",
}: Props) {
  const { user, role, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = Boolean(user) && role === ROLES.admin;

  if (authLoading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const publicUrl = await uploadPropertyImage(file, propertyId);

      await saveImage(propertyId, publicUrl, true, source, 0, 0, file.size);

      await refreshPropertyCache();

      setMessage("Image uploaded.");
      e.target.value = "";
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-medium text-slate-700">
        Upload property image
      </label>

      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={uploading}
        className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800 disabled:opacity-60"
      />

      {uploading ? (
        <p className="mt-2 text-sm text-slate-500">Uploading...</p>
      ) : null}

      {message ? (
        <p className="mt-2 text-sm text-slate-700">{message}</p>
      ) : null}
    </div>
  );
}
