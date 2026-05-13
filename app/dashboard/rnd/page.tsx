"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { formatIDR } from "@/lib/formatters/currency";
import { Plus, ChevronDown, ChevronUp, Package, Trash2 } from "lucide-react";

type InventoryUsage = {
  id: string;
  quantity: number;
  unitCost: string;
  product: { name: string };
  flavor: { name: string; colorHex: string | null } | null;
};

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: string;
  subCategory: string | null;
  inventoryUsages: InventoryUsage[];
};

type RndProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  totalExpenses: number;
  targetFlavor: { name: string } | null;
  expenses: Expense[];
};

type Product = { id: string; name: string; unitCost: number; flavors: { id: string; name: string }[] };
type FormInventoryItem = { productId: string; flavorId: string; quantity: number };

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function RndPage() {
  const [projects, setProjects] = useState<RndProject[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showExpense, setShowExpense] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: "", description: "", startDate: new Date().toISOString().split("T")[0] });
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    subCategory: "ingredients",
  });
  const [inventoryItems, setInventoryItems] = useState<FormInventoryItem[]>([]);

  const fetchProjects = () =>
    fetch("/api/rnd").then((r) => r.json()).then(setProjects).catch(() => {});

  useEffect(() => {
    fetchProjects();
    fetch("/api/settings/products").then((r) => r.json()).then(setProducts).catch(() => {});
  }, []);

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
      body: JSON.stringify({
        ...newExpense,
        inventoryItems: inventoryItems
          .filter((i) => i.productId)
          .map((i) => ({ productId: i.productId, flavorId: i.flavorId || undefined, quantity: i.quantity })),
      }),
    });
    setShowExpense(null);
    setNewExpense({ date: new Date().toISOString().split("T")[0], description: "", amount: 0, subCategory: "ingredients" });
    setInventoryItems([]);
    fetchProjects();
  }

  function addInventoryItem() {
    setInventoryItems((prev) => [...prev, { productId: "", flavorId: "", quantity: 1 }]);
  }

  function removeInventoryItem(idx: number) {
    setInventoryItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateInventoryItem(idx: number, field: keyof FormInventoryItem, value: string | number) {
    setInventoryItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "productId") return { ...item, productId: value as string, flavorId: "" };
        return { ...item, [field]: value };
      })
    );
  }

  function cancelExpense() {
    setShowExpense(null);
    setInventoryItems([]);
    setNewExpense({ date: new Date().toISOString().split("T")[0], description: "", amount: 0, subCategory: "ingredients" });
  }

  return (
    <>
      <Topbar title="R&D" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">R&D Projects</h2>
            <p className="text-sm text-gray-500">Expenses tracked separately — not mixed into financial totals</p>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition min-h-[44px]"
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      <div key={exp.id} className="py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-start justify-between text-sm">
                          <div>
                            <p className="text-gray-800 font-medium">{exp.description}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(exp.date).toLocaleDateString("id-ID")} · {exp.subCategory}
                            </p>
                          </div>
                          {Number(exp.amount) > 0 && (
                            <span className="font-medium text-red-500 shrink-0 ml-2">
                              {formatIDR(parseFloat(exp.amount))}
                            </span>
                          )}
                        </div>
                        {exp.inventoryUsages.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {exp.inventoryUsages.map((u) => (
                              <div key={u.id} className="flex items-center gap-2 text-xs text-gray-500">
                                <Package size={10} className="shrink-0 text-gray-400" />
                                <span>
                                  {u.product.name}{u.flavor ? ` – ${u.flavor.name}` : ""}: {u.quantity} pcs
                                  <span className="text-gray-400"> (−{formatIDR(u.quantity * parseFloat(String(u.unitCost)))} stock value)</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {showExpense === p.id ? (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Log Expense</p>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Date</label>
                          <input
                            type="date"
                            value={newExpense.date}
                            onChange={(e) => setNewExpense((x) => ({ ...x, date: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Category</label>
                          <select
                            value={newExpense.subCategory}
                            onChange={(e) => setNewExpense((x) => ({ ...x, subCategory: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
                          >
                            <option value="ingredients">Ingredients</option>
                            <option value="equipment">Equipment</option>
                            <option value="testing">Testing</option>
                            <option value="labor">Labor</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Description"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense((x) => ({ ...x, description: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                      />
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Cash Cost (IDR) — leave 0 if only using stock</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((x) => ({ ...x, amount: parseFloat(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none"
                        />
                      </div>

                      {/* Inventory items used */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Inventory Used (optional)
                          </label>
                          <button
                            type="button"
                            onClick={addInventoryItem}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <Plus size={11} /> Add item
                          </button>
                        </div>
                        {inventoryItems.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No inventory items consumed</p>
                        ) : (
                          <div className="space-y-2">
                            {inventoryItems.map((item, idx) => {
                              const selectedProduct = products.find((p) => p.id === item.productId);
                              return (
                                <div key={idx} className="bg-white rounded-lg p-2 space-y-1.5 border border-gray-200">
                                  <div className="flex gap-1.5 items-start">
                                    <div className="flex-1">
                                      <select
                                        value={item.productId}
                                        onChange={(e) => updateInventoryItem(idx, "productId", e.target.value)}
                                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
                                      >
                                        <option value="">Product...</option>
                                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                    </div>
                                    {selectedProduct && selectedProduct.flavors.length > 0 && (
                                      <div className="flex-1">
                                        <select
                                          value={item.flavorId}
                                          onChange={(e) => updateInventoryItem(idx, "flavorId", e.target.value)}
                                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
                                        >
                                          <option value="">Flavor...</option>
                                          {selectedProduct.flavors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                      </div>
                                    )}
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      value={item.quantity}
                                      onChange={(e) => updateInventoryItem(idx, "quantity", parseInt(e.target.value) || 1)}
                                      className="w-14 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                      placeholder="Qty"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeInventoryItem(idx)}
                                      className="p-1 text-red-400 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={cancelExpense} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-xs font-medium">
                          Cancel
                        </button>
                        <button onClick={() => addExpense(p.id)} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-xs font-medium hover:bg-blue-700">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowExpense(p.id)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 min-h-[44px]"
                    >
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
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">New R&D Project</h3>
            <form onSubmit={createProject} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Project Name</label>
                <input
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Matcha Flavor Trial Q2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium min-h-[44px]"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 min-h-[44px]">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
