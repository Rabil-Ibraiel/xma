"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editParty, getAllParties } from "../actions/getParties";

const fmt = new Intl.NumberFormat("en-US");
const onlyDigits = (s) => s.replace(/[^\d]/g, "");
const withCommas = (s) => fmt.format(Number(s || 0));

export default function GeneralParty() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Per-row formatted drafts
  const [draft, setDraft] = useState({}); // { [id]: { votes: "123,456", chairs: "12" } }

  useEffect(() => {
    setLoading(true);
    getAllParties().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setParties(list);

      const d = {};
      list.forEach((p) => {
        d[p.id] = {
          votes: withCommas(Number(p.numberOfVoting)),
          chairs: withCommas(Number(p.thisElecChairs)),
        };
      });
      setDraft(d);

      setLoading(false);
    });
  }, []);

  const onChangeVotes = (id, val) => {
    const raw = onlyDigits(val);
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), votes: withCommas(raw) },
    }));
  };

  const onChangeChairs = (id, val) => {
    const raw = onlyDigits(val);
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), chairs: withCommas(raw) },
    }));
  };

  // Submit wrapper: strip commas before calling server action
  const updateAction = async (formData) => {
    const id = Number(formData.get("id"));
    setSavingId(id);

    // Clean values for server
    const votesStr = String(formData.get("numberOfVoting") ?? "").replace(/,/g, "");
    const chairsStr = String(formData.get("thisElecChairs") ?? "").replace(/,/g, "");
    formData.set("numberOfVoting", votesStr);
    formData.set("thisElecChairs", chairsStr);

    await editParty(formData);

    const numberOfVoting = Number(votesStr);
    const thisElecChairs = Number(chairsStr);

    // Optimistic UI update
    setParties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, numberOfVoting, thisElecChairs } : p))
    );

    startTransition(() => router.refresh());
    setSavingId(0);
  };

  if (loading) return <p className="mt-8 text-center">جارٍ التحميل…</p>;

  return (
    <div className="flex flex-wrap gap-6 items-start mt-8">
      {parties.map((party) => (
        <div
          key={party.abbr}
          className="flex flex-col gap-2 border-2 rounded p-4 w-[calc(25%-24px)]"
          style={{ borderColor: party.color }}
        >
          <h2
            className="text-white font-bold w-fit px-4 py-1 rounded text-xl"
            style={{ backgroundColor: party.color }}
          >
            {party.arabicName}
          </h2>

          <form action={updateAction} className="mt-2 space-y-4">
            <input type="hidden" name="id" value={party.id} />

            <div className="flex items-center gap-2">
              <label className="min-w-24">عدد الأصوات:</label>
              <input
                className="border py-1 px-2 mr-1 w-40  text-xl"
                type="text"
                name="numberOfVoting"
                inputMode="numeric"
                value={draft[party.id]?.votes ?? ""}
                onChange={(e) => onChangeVotes(party.id, e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="min-w-24">عدد المقاعد:</label>
              <input
                className="border py-1 px-2 mr-1 w-20 text-xl"
                type="text"
                name="thisElecChairs"
                inputMode="numeric"
                value={draft[party.id]?.chairs ?? ""}
                onChange={(e) => onChangeChairs(party.id, e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingId === party.id || isPending}
              className="text-white font-bold w-full flex justify-center items-center text-xl rounded mt-6 cursor-pointer py-2 disabled:opacity-60"
              style={{ backgroundColor: party.color }}
            >
              {savingId === party.id ? "جارٍ التحديث…" : "تحديث"}
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
