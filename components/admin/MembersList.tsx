"use client";

import { useState } from "react";

type Member = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  email: string | null;
  created_at: string | null;
  is_admin: boolean;
  is_suspended: boolean;
};

type Props = {
  members: Member[];
  unlocksByUser: Record<string, number>;
  currentAdminId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type RowMode = "idle" | "confirm-suspend" | "confirm-delete";

type RowState = {
  mode: RowMode;
  deleteInput: string;
  error: string;
};

const IDLE: RowState = { mode: "idle", deleteInput: "", error: "" };

export default function MembersList({ members: initialMembers, unlocksByUser, currentAdminId }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  function getRowState(id: string): RowState {
    return rowStates[id] ?? IDLE;
  }

  function setRowState(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [id]: { ...getRowState(id), ...patch } }));
  }

  async function doSuspend(member: Member) {
    setProcessing(member.id);
    const res = await fetch("/api/admin/suspend-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id, suspend: !member.is_suspended }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_suspended: !member.is_suspended } : m))
      );
      setRowState(member.id, IDLE);
    } else {
      setRowState(member.id, { error: data.error ?? "Something went wrong." });
    }
    setProcessing(null);
  }

  async function doDelete(member: Member) {
    setProcessing(member.id);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } else {
      setRowState(member.id, { error: data.error ?? "Something went wrong." });
      setProcessing(null);
    }
  }

  return (
    <div className="bg-white border border-pink-pale rounded-xl2 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-pink-pale">
            <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal">
              Name
            </th>
            <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal hidden sm:table-cell">
              Email
            </th>
            <th className="text-left px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal hidden md:table-cell">
              Joined
            </th>
            <th className="text-center px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal">
              Books
            </th>
            <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-normal">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pink-pale">
          {members.map((m) => {
            const state = getRowState(m.id);
            const isSelf = m.id === currentAdminId;
            const isProcessing = processing === m.id;

            return (
              <tr key={m.id} className="hover:bg-cream transition-colors align-top">
                <td className="px-5 py-3">
                  <span className="text-plum font-medium">
                    {m.nickname ?? m.display_name ?? "Not set"}
                  </span>
                  {m.nickname && m.display_name && (
                    <span className="block text-xs text-gray-400">{m.display_name}</span>
                  )}
                  {m.is_admin && (
                    <span className="ml-2 text-xs bg-gold/20 text-plum px-1.5 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                  {m.is_suspended && (
                    <span className="ml-2 text-xs bg-pink-deep/10 text-pink-deep px-1.5 py-0.5 rounded-full">
                      Suspended
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">
                  {m.email ?? "Not set"}
                </td>
                <td className="px-5 py-3 text-gray-400 hidden md:table-cell">
                  {m.created_at ? formatDate(m.created_at) : "Not set"}
                </td>
                <td className="px-5 py-3 text-center text-gray-400">
                  {unlocksByUser[m.id] ?? 0}
                </td>
                <td className="px-5 py-3 text-right">
                  {isSelf ? (
                    <span className="text-xs text-gray-300 italic">You</span>
                  ) : state.mode === "idle" ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRowState(m.id, { mode: "confirm-suspend" })}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-ink transition-colors"
                      >
                        {m.is_suspended ? "Unsuspend" : "Suspend"}
                      </button>
                      <button
                        onClick={() => setRowState(m.id, { mode: "confirm-delete" })}
                        className="text-xs px-2.5 py-1 rounded-lg border border-pink-deep text-pink-deep hover:bg-pink-pale transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ) : state.mode === "confirm-suspend" ? (
                    <div className="text-left inline-block max-w-xs">
                      <p className="text-xs text-gray-500 mb-2">
                        {m.is_suspended
                          ? `Unsuspend ${m.nickname ?? m.email}? They'll be able to sign in again immediately.`
                          : m.is_admin
                          ? `Suspend this ADMIN account (${m.nickname ?? m.email})? They won't be able to sign in, including to /admin, until unsuspended.`
                          : `Suspend ${m.nickname ?? m.email}? They won't be able to sign in until unsuspended. No data is affected.`}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => doSuspend(m)}
                          disabled={isProcessing}
                          className="text-xs px-2.5 py-1 rounded-lg bg-pink-pale text-pink-deep hover:bg-pink-dusty transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? "…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setRowState(m.id, IDLE)}
                          disabled={isProcessing}
                          className="text-xs px-2.5 py-1 text-gray-400 hover:text-ink transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      {state.error && <p className="text-xs text-pink-deep mt-1">{state.error}</p>}
                    </div>
                  ) : (
                    // confirm-delete
                    <div className="text-left inline-block max-w-xs">
                      <p className="text-xs text-pink-deep mb-2">
                        This permanently deletes {m.nickname ?? m.email}
                        {"'"}s account and everything tied to it (reflections, reactions,
                        connections, badges, etc.) forever. This cannot be undone.
                        {m.is_admin && " This account is an admin."}
                        {" "}Type{" "}
                        <span className="font-mono font-bold">{m.is_admin ? "DELETE ADMIN" : "DELETE"}</span>{" "}
                        to confirm.
                      </p>
                      <input
                        type="text"
                        value={state.deleteInput}
                        onChange={(e) => setRowState(m.id, { deleteInput: e.target.value })}
                        placeholder={m.is_admin ? "DELETE ADMIN" : "DELETE"}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs mb-2 focus:outline-none focus:border-pink-dusty"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => doDelete(m)}
                          disabled={
                            isProcessing ||
                            state.deleteInput !== (m.is_admin ? "DELETE ADMIN" : "DELETE")
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-pink-deep text-white hover:bg-plum transition-colors disabled:opacity-40"
                        >
                          {isProcessing ? "…" : "Confirm Delete"}
                        </button>
                        <button
                          onClick={() => setRowState(m.id, IDLE)}
                          disabled={isProcessing}
                          className="text-xs px-2.5 py-1 text-gray-400 hover:text-ink transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      {state.error && <p className="text-xs text-pink-deep mt-1">{state.error}</p>}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
