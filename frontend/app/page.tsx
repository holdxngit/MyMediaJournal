"use client";

import { useState } from "react";

type MediaItem = {
  id: number;
  title: string;
  mediaType: string;
  dateConsumed: string;
  timeConsumed: number; // total minutes
};

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

export default function Home() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    {
      id: 1,
      title: "Persona 3 Reload",
      mediaType: "Game",
      dateConsumed: "2026-03-31",
      timeConsumed: 150,
    },
    {
      id: 2,
      title: "Frieren",
      mediaType: "Anime",
      dateConsumed: "2026-03-29",
      timeConsumed: 24,
    },
  ]);

  const [newItem, setNewItem] = useState({
    title: "",
    mediaType: "",
    dateConsumed: "",
    timeHours: "",
    timeMinutes: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState({
    title: "",
    mediaType: "",
    dateConsumed: "",
    timeConsumed: 0,
  });

  const handleAddItem = () => {
    if (
      !newItem.title.trim() ||
      !newItem.mediaType.trim() ||
      !newItem.dateConsumed
    ) {
      return;
    }

    const hours = parseInt(newItem.timeHours) || 0;
    const minutes = parseInt(newItem.timeMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;

    const item: MediaItem = {
      id: Date.now(),
      title: newItem.title,
      mediaType: newItem.mediaType,
      dateConsumed: newItem.dateConsumed,
      timeConsumed: totalMinutes,
    };

    setMediaItems((prev) => [item, ...prev]);
    setNewItem({
      title: "",
      mediaType: "",
      dateConsumed: "",
      timeHours: "",
      timeMinutes: "",
    });
  };

  const handleDeleteItem = (id: number) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setEditItem({
      title: item.title,
      mediaType: item.mediaType,
      dateConsumed: item.dateConsumed,
      timeConsumed: item.timeConsumed,
    });
  };

  const handleSaveEdit = (id: number) => {
    if (
      !editItem.title.trim() ||
      !editItem.mediaType.trim() ||
      !editItem.dateConsumed
    ) {
      return;
    }

    setMediaItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              title: editItem.title,
              mediaType: editItem.mediaType,
              dateConsumed: editItem.dateConsumed,
              timeConsumed: editItem.timeConsumed,
            }
          : item
      )
    );

    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#15152a] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
            Media Tracker
          </h1>
          <p className="mt-2 text-gray-400">
            Track what you watched, played, or read.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur-xl">
          <h2 className="mb-4 text-xl font-semibold">Add New Media Item</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Title"
              value={newItem.title}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, title: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />

            <select
              value={newItem.mediaType}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, mediaType: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            >
              <option value="">Media Type</option>
              <option value="Movie">Movie</option>
              <option value="Show">Show</option>
              <option value="Anime">Anime</option>
              <option value="Game">Game</option>
              <option value="Book">Book</option>
              <option value="Manga">Manga</option>
              <option value="Other">Other</option>
            </select>

            <input
              type="date"
              value={newItem.dateConsumed}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  dateConsumed: e.target.value,
                }))
              }
              className="rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Hrs"
                min="0"
                value={newItem.timeHours}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    timeHours: e.target.value,
                  }))
                }
                className="w-1/2 rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />

              <input
                type="number"
                placeholder="Min"
                min="0"
                value={newItem.timeMinutes}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    timeMinutes: e.target.value,
                  }))
                }
                className="w-1/2 rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>

          <button
            onClick={handleAddItem}
            className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30"
          >
            Add Entry
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur-xl">
          <h2 className="mb-4 text-xl font-semibold">Your Entries</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-sm uppercase tracking-wide text-gray-400 backdrop-blur">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Media Type</th>
                  <th className="px-4 py-3">Date Consumed</th>
                  <th className="px-4 py-3">Time Consumed</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {mediaItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 text-sm text-gray-200 transition hover:bg-white/5"
                  >
                    {editingId === item.id ? (
                      <>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={editItem.title}
                            onChange={(e) =>
                              setEditItem((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <select
                            value={editItem.mediaType}
                            onChange={(e) =>
                              setEditItem((prev) => ({
                                ...prev,
                                mediaType: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                          >
                            <option value="Movie">Movie</option>
                            <option value="Show">Show</option>
                            <option value="Anime">Anime</option>
                            <option value="Game">Game</option>
                            <option value="Book">Book</option>
                            <option value="Manga">Manga</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="date"
                            value={editItem.dateConsumed}
                            onChange={(e) =>
                              setEditItem((prev) => ({
                                ...prev,
                                dateConsumed: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Hrs"
                              value={Math.floor(editItem.timeConsumed / 60)}
                              onChange={(e) => {
                                const hours = parseInt(e.target.value) || 0;
                                const minutes = editItem.timeConsumed % 60;
                                setEditItem((prev) => ({
                                  ...prev,
                                  timeConsumed: hours * 60 + minutes,
                                }));
                              }}
                              className="w-1/2 rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                            />

                            <input
                              type="number"
                              min="0"
                              placeholder="Min"
                              value={editItem.timeConsumed % 60}
                              onChange={(e) => {
                                const minutes = parseInt(e.target.value) || 0;
                                const hours = Math.floor(
                                  editItem.timeConsumed / 60
                                );
                                setEditItem((prev) => ({
                                  ...prev,
                                  timeConsumed: hours * 60 + minutes,
                                }));
                              }}
                              className="w-1/2 rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="rounded-lg bg-violet-600 px-3 py-2 text-white transition-all duration-200 hover:bg-violet-500"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="rounded-lg bg-gray-700 px-3 py-2 text-white transition-all duration-200 hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 font-medium">{item.title}</td>
                        <td className="px-4 py-4">{item.mediaType}</td>
                        <td className="px-4 py-4">{item.dateConsumed}</td>
                        <td className="px-4 py-4">
                          {formatDuration(item.timeConsumed)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="rounded-lg bg-violet-600 px-3 py-2 text-white transition-all duration-200 hover:bg-violet-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-white transition-all duration-200 hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {mediaItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No media entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}