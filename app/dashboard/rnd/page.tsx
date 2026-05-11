"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

type RndProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  totalExpenses: number;
  targetFlavor: { name: string } | null;
  expenses: { id: string; date: string; description: string; amount: string; subCategory: string | null }[];
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function RndPage() {
  const [projects, setProjects] = useState<RndProject[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showExpense, setShowExpense] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "", startDate: new Date().toISOString().split("T")[0] });
  const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split("T")[0], description: "", amount: 0, subCategory: "ingredients" });

  const fetchProjects = () =>
    fetch("/api/rnd").then((r) => r.json()).then(setProjects).catch(() => {});

  useEffect(() => { fetchProjects(); }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/rnd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newProject) });
    setShowNewProject(false);
    fetchProjects();
  }

  async function addExpense(projectId: string) {
    await fetch(`/api/rnd/${projectId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExpense),
    });
    setShowExpense(null);
    setNewExpense({ date: new Date().toISOString().split("T")[0], description: "", amount: 0, subCategory: "ingredients" });
    fetchProjects();
  }

  return (
    <>
      <Topbar title="R&D" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">R&D Projects</h2>
            <p className="text-sm text-gray-500">Track research and development expenses</p>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={15} />
            New Project
          </button>
        </div>

        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
              No R&D projects yet.
            </div>
          ) : projects.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100"}`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Started {new Date(p.startDate).toLocaleDateString("id-ID")}
                    {p.targetFlavor && ` · Target: ${p.targetFlavor.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-bold text-red-500">{formatIDR(p.totalExpenses)}</span>
                  {expanded === p.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {expanded === p.id && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {p.description && <p className="text-sm text-gray-600">{p.description}</p>}

                  <div className="space-y-2">
                    {p.expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-gray-800">{exp.description}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(exp.date).toLocaleDateString("id-ID")} · {exp.subCategory}
                          </p>
                        </div>
                        <span className="font-medium text-red-500">{formatIDR(parseFloat(exp.amount))}</span>
                      </div>
                    ))}
                  </div>

                  {showExpense === p.id ? (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Date</label>
                          <input type="date" value={newExpense.date} onChange={(e) => setNewExpense((x) => ({ ...x, date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Category</label>
                          <select value={newExpense.subCategory} onChange={(e) => setNewExpense((x) => ({ ...x, subCategory: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                            <option value="ingredients">Ingredients</option>
                            <option value="equipment">Equipment</option>
                            <option value="testing">Testing</option>
                            <option value="labor">Labor</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <input type="text" placeholder="Description" value={newExpense.description} onChange={(e) => setNewExpense((x) => ({ ...x, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                      <input type="number" inputMode="numeric" placeholder="Amount (IDR)" value={newExpense.amount} onChange={(e) => setNewExpense((x) => ({ ...x, amount: parseFloat(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowExpense(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-1.5 text-xs font-medium">Cancel</button>
                        <button onClick={() => addExpense(p.id)} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-medium">Save</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowExpense(p.id)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                      <Plus size={14} /> Log Expense
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">New R&D Project</h3>
            <form onSubmit={createProject} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Project Name</label>
                <input required value={newProject.name} onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Matcha Flavor Trial Q2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <textarea value={newProject.description} onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <input type="date" value={newProject.startDate} onChange={(e) => setNewProject((p) => ({ ...p, startDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
