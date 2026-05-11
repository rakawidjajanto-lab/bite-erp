"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { MapPin, Phone, User, Plus, ArrowRight } from "lucide-react";

type Venue = {
  id: string;
  name: string;
  location: string | null;
  contactName: string | null;
  contactPhone: string | null;
};

export default function VenueListPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/venues")
      .then((r) => r.json())
      .then((v) => { setVenues(v); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Venues" />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <MapPin size={24} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No venues yet</p>
            <p className="text-sm text-gray-400 mb-4">Add your first venue in Settings.</p>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              Add Venue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((v) => (
              <Link
                key={v.id}
                href={`/dashboard/venue/${v.id}`}
                className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{v.name}</h3>
                {v.location && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-1">
                    <MapPin size={12} className="shrink-0" />
                    {v.location}
                  </p>
                )}
                {v.contactName && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-1">
                    <User size={12} className="shrink-0" />
                    {v.contactName}
                  </p>
                )}
                {v.contactPhone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Phone size={12} className="shrink-0" />
                    {v.contactPhone}
                  </p>
                )}
              </Link>
            ))}
            <Link
              href="/dashboard/settings"
              className="flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-5 hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-600 min-h-[140px]"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">Add Venue</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
