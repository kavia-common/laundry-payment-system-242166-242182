"use client";

import { useEffect, useMemo, useState } from "react";

type Healthz = {
  status: string;
  db?: {
    reachable: boolean;
    version: string;
  };
};

type Machine = {
  id: number;
  location: string;
  name: string;
  type: string;
  status: string;
};

function getApiBase(): string {
  // Next.js only exposes env vars to the browser if they start with NEXT_PUBLIC_.
  // The manifest currently defines API_BASE, so we support both to be robust:
  // - NEXT_PUBLIC_API_BASE (preferred for client-side)
  // - API_BASE (may not be available client-side depending on runtime)
  return (
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.API_BASE ??
    ""
  );
}

export default function Home() {
  const apiBase = useMemo(() => getApiBase().replace(/\/$/, ""), []);

  const [health, setHealth] = useState<Healthz | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setError(null);

        const base = apiBase; // may be "" => same-origin
        const [hRes, mRes] = await Promise.all([
          fetch(`${base}/healthz`, { signal: controller.signal }),
          fetch(`${base}/api/machines`, { signal: controller.signal }),
        ]);

        if (!hRes.ok) {
          throw new Error(`Backend /healthz failed: ${hRes.status} ${hRes.statusText}`);
        }
        if (!mRes.ok) {
          throw new Error(`Backend /api/machines failed: ${mRes.status} ${mRes.statusText}`);
        }

        const hJson = (await hRes.json()) as Healthz;
        const mJson = (await mRes.json()) as Machine[];

        setHealth(hJson);
        setMachines(mJson);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }

    load();
    return () => controller.abort();
  }, [apiBase]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Laundry Payment System (Bootstrap)
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This screen verifies the frontend ↔ backend ↔ PostgreSQL wiring.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-base font-semibold">Backend status</h2>

          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : !health ? (
            <p className="mt-2 text-sm text-gray-600">Loading…</p>
          ) : (
            <div className="mt-2 text-sm text-gray-800">
              <p>
                <span className="font-medium">API:</span> {health.status}
              </p>
              <p className="mt-1">
                <span className="font-medium">DB reachable:</span>{" "}
                {health.db?.reachable ? "yes" : "no"}
              </p>
              {health.db?.version ? (
                <p className="mt-1">
                  <span className="font-medium">DB version:</span> {health.db.version}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Machines</h2>
            <p className="text-xs text-gray-500">
              API base: {apiBase || "(same-origin)"}
            </p>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full border-collapse bg-white text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {machines.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-600" colSpan={5}>
                      {health ? "No machines found." : "Loading…"}
                    </td>
                  </tr>
                ) : (
                  machines.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3">{m.id}</td>
                      <td className="px-4 py-3">{m.name}</td>
                      <td className="px-4 py-3">{m.type}</td>
                      <td className="px-4 py-3">{m.status}</td>
                      <td className="px-4 py-3">{m.location}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
