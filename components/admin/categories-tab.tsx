"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPrivilegeCategory,
  deletePrivilegeCategory,
  fetchAllPrivilegeCategories,
  updatePrivilegeCategory,
} from "@/lib/supabase/data";
import type { CreatePrivilegeCategoryInput, PrivilegeCategory } from "@/lib/types";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryForm, categoryToFormInput } from "./category-form";

export function CategoriesTab() {
  const [categories, setCategories] = useState<PrivilegeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PrivilegeCategory | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const rows = await fetchAllPrivilegeCategories();
    setCategories(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? Privileges using it must be reassigned first.")) return;
    setActionError(null);
    setDeletingId(id);
    const res = await deletePrivilegeCategory(id);
    setDeletingId(null);
    if (!res.ok) {
      setActionError(res.error ?? "Could not delete category.");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">Privilege Categories</h2>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>
      <p className="text-ink-muted text-xs mb-4 max-w-2xl">
        Manage category labels, keys, and badge colors used on privilege cards. Categories are referenced by numeric ID.
      </p>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
          <Tag size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-forest font-medium">No categories yet</p>
          <p className="text-ink-muted text-sm mt-2">Add your first privilege category.</p>
        </div>
      ) : (
        <div className="bg-white border border-cream-300 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-100 border-b border-cream-300">
                {["ID", "Label", "Key", "Preview", "Sort", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-cream-50/50">
                  <td className="px-4 py-3 font-mono text-ink-muted text-xs">{c.id}</td>
                  <td className="px-4 py-3 text-forest font-medium">{c.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-light">{c.key}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2.5 py-1 rounded border", c.color)}>{c.label}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">{c.sortOrder ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="rounded-lg border border-cream-300 p-1.5 text-ink-muted hover:text-forest hover:bg-cream-50"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => void handleDelete(c.id)}
                        className="rounded-lg border border-cream-300 p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategoryForm
        open={showAdd}
        title="Add Category"
        submitLabel="Create Category"
        onClose={() => setShowAdd(false)}
        onSubmit={async (input: CreatePrivilegeCategoryInput) => {
          const res = await createPrivilegeCategory(input);
          if (!res.ok) return { ok: false, error: res.error };
          await loadCategories();
          return { ok: true };
        }}
      />

      <CategoryForm
        key={editing?.id}
        open={!!editing}
        title="Edit Category"
        submitLabel="Save Changes"
        initial={editing ? categoryToFormInput(editing) : undefined}
        onClose={() => setEditing(null)}
        onSubmit={async (input: CreatePrivilegeCategoryInput) => {
          if (!editing) return { ok: false, error: "No category selected." };
          const res = await updatePrivilegeCategory(editing.id, input);
          if (!res.ok) return { ok: false, error: res.error };
          setCategories((prev) => prev.map((c) => (c.id === editing.id ? res.data : c)));
          setEditing(null);
          return { ok: true };
        }}
      />
    </div>
  );
}
