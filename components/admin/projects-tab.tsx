"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createResidenceProject,
  deleteResidenceProject,
  fetchAllResidenceProjects,
  updateResidenceProject,
} from "@/lib/supabase/data";
import type { ResidenceProject } from "@/lib/types";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { ActiveToggle } from "./active-toggle";

export function ProjectsTab() {
  const [projects, setProjects] = useState<ResidenceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const res = await fetchAllResidenceProjects();
    setProjects(res.projects);
    setLoadError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setActionError("Project name is required.");
      return;
    }
    const parsedSort = sortOrder.trim() === "" ? nextSortOrder(projects) : Number(sortOrder);
    if (!Number.isInteger(parsedSort) || parsedSort < 0) {
      setActionError("Sort order must be a whole number of 0 or more.");
      return;
    }

    setActionError(null);
    setSaving(true);
    const res = await createResidenceProject({ name: trimmed, sortOrder: parsedSort, isActive: true });
    setSaving(false);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    setName("");
    setSortOrder("");
    setProjects((prev) => sortProjects([...prev, res.data]));
  };

  const startEdit = (project: ResidenceProject) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditSort(String(project.sortOrder));
    setActionError(null);
  };

  const saveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setActionError("Project name is required.");
      return;
    }
    const parsedSort = Number(editSort);
    if (!Number.isInteger(parsedSort) || parsedSort < 0) {
      setActionError("Sort order must be a whole number of 0 or more.");
      return;
    }

    setActionError(null);
    setBusyId(id);
    const res = await updateResidenceProject(id, { name: trimmed, sortOrder: parsedSort });
    setBusyId(null);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    setEditingId(null);
    setProjects((prev) => sortProjects(prev.map((project) => (project.id === id ? res.data : project))));
  };

  const toggleActive = async (project: ResidenceProject) => {
    setActionError(null);
    setBusyId(project.id);
    const res = await updateResidenceProject(project.id, { isActive: !project.isActive });
    setBusyId(null);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    setProjects((prev) => prev.map((row) => (row.id === project.id ? res.data : row)));
  };

  const handleDelete = async (project: ResidenceProject) => {
    if (
      !confirm(
        `Remove “${project.name}” from the registration list? Members who already chose it keep that name on their profile.`
      )
    ) {
      return;
    }
    setActionError(null);
    setBusyId(project.id);
    const res = await deleteResidenceProject(project.id);
    setBusyId(null);
    if (!res.ok) {
      setActionError(res.error ?? "Could not delete project.");
      return;
    }
    setProjects((prev) => prev.filter((row) => row.id !== project.id));
    if (editingId === project.id) setEditingId(null);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-ink-muted text-xs tracking-[2px] uppercase font-semibold">Residence Projects</h2>
        <p className="text-ink-muted text-xs mt-2 max-w-2xl">
          These names appear when a resident registers. Turn a project off to hide it from new applications. Agent and staff accounts do not use this list.
        </p>
      </div>

      <form onSubmit={(event) => void handleAdd(event)} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="label-text">Project name</span>
          <input
            className="input-field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="THE TITLE …"
          />
        </label>
        <label className="sm:w-28">
          <span className="label-text">Sort</span>
          <input
            className="input-field"
            inputMode="numeric"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="Auto"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-xs px-4 py-3 flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <Plus size={14} /> {saving ? "Adding…" : "Add Project"}
        </button>
      </form>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load projects: {loadError}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-cream-300 rounded-2xl p-10 text-center shadow-card">
          <Building2 size={32} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-forest font-medium">No projects yet</p>
          <p className="text-ink-muted text-sm mt-2">Add the first residence project for the registration form.</p>
        </div>
      ) : (
        <div className="bg-white border border-cream-300 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-100 border-b border-cream-300">
                {["Project", "Sort", "On form", ""].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-ink-muted text-xs font-semibold uppercase tracking-wide">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {projects.map((project) => {
                const editing = editingId === project.id;
                const busy = busyId === project.id;
                return (
                  <tr key={project.id} className="hover:bg-cream-50/50">
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          className="input-field"
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                      ) : (
                        <span className="text-forest font-medium">{project.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 w-28">
                      {editing ? (
                        <input
                          className="input-field"
                          inputMode="numeric"
                          value={editSort}
                          onChange={(event) => setEditSort(event.target.value)}
                        />
                      ) : (
                        <span className="text-ink-muted text-xs">{project.sortOrder}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActiveToggle
                        checked={project.isActive}
                        label={project.isActive ? "Shown" : "Hidden"}
                        onChange={() => void toggleActive(project)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void saveEdit(project.id)}
                              className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-xs text-forest hover:bg-cream-50 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-xs text-ink-muted hover:bg-cream-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(project)}
                            className="rounded-lg border border-cream-300 p-1.5 text-ink-muted hover:text-forest hover:bg-cream-50"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(project)}
                          className="rounded-lg border border-cream-300 p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function nextSortOrder(projects: ResidenceProject[]) {
  return projects.reduce((max, project) => Math.max(max, project.sortOrder), 0) + 1;
}

function sortProjects(projects: ResidenceProject[]) {
  return [...projects].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
