"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editParty, getAllParties } from "../actions/getParties";
import { Toaster, toast } from "react-hot-toast";

/* ---------------- helpers ---------------- */
const onlyDigits = (v) => String(v ?? "").replace(/\D+/g, "");
const withCommasDigits = (digits) =>
  digits ? String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "";

// safer formatter that accepts number | bigint | string
const toDigitsString = (v) => {
  if (v == null) return "0";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return Math.trunc(v).toString();
  return onlyDigits(v);
};

/* ---------------- skeleton ---------------- */
const CardSkeleton = () => (
  <div className="flex flex-col gap-2 border-2 rounded p-4 w-[calc(25%-24px)] min-w-[260px] animate-pulse border-slate-200">
    <div className="h-8 w-40 rounded bg-slate-200" />
    <div className="mt-2 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-24 rounded bg-slate-200" />
        <div className="h-10 w-40 rounded bg-slate-200" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-24 rounded bg-slate-200" />
        <div className="h-10 w-20 rounded bg-slate-200" />
      </div>
      <div className="h-11 w-full rounded bg-slate-200 mt-6" />
    </div>
  </div>
);

/* ---------------- component ---------------- */
export default function GeneralParty() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true); // start true -> skeleton immediately
  const [savingId, setSavingId] = useState(0);
  const [statusId, setStatusId] = useState(0); // brief success status per card
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Per-row formatted drafts: { [id]: { votes: "123,456", chairs: "12" } }
  const [draft, setDraft] = useState({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const data = await getAllParties();
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setParties(list);

        const d = {};
        list.forEach((p) => {
          d[p.id] = {
            votes: withCommasDigits(toDigitsString(p.numberOfVoting)),
            chairs: withCommasDigits(toDigitsString(p.thisElecChairs)),
          };
        });
        setDraft(d);
      } catch (e) {
        console.error(e);
        toast.error("فشل تحميل البيانات. حاول مرة أخرى.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onChangeVotes = (id, val) => {
    const rawDigits = onlyDigits(val);
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), votes: withCommasDigits(rawDigits) },
    }));
  };

  const onChangeChairs = (id, val) => {
    const rawDigits = onlyDigits(val);
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), chairs: withCommasDigits(rawDigits) },
    }));
  };

  // Submit wrapper: strip commas before calling server action (keeps same functionality)
  const updateAction = async (formData) => {
    const id = Number(formData.get("id"));
    setSavingId(id);

    // Clean values for server
    const votesStr = String(formData.get("numberOfVoting") ?? "").replace(/,/g, "");
    const chairsStr = String(formData.get("thisElecChairs") ?? "").replace(/,/g, "");
    formData.set("numberOfVoting", votesStr);
    formData.set("thisElecChairs", chairsStr);

    try {
      await toast.promise(
        editParty(formData),
        {
          loading: "جارٍ الحفظ…",
          success: "تم الحفظ بنجاح",
          error: "لم يتم حفظ التغييرات",
        },
        {
          style: { direction: "rtl" },
          success: { duration: 1600 },
          error: { duration: 2200 },
        }
      );

      // Optimistic UI update
      const numberOfVoting = Number(votesStr);
      const thisElecChairs = Number(chairsStr);
      setParties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, numberOfVoting, thisElecChairs } : p))
      );

      // refresh in background to stay in sync
      startTransition(() => router.refresh());

      // brief status line (kept)
      setStatusId(id);
      setTimeout(() => setStatusId((s) => (s === id ? 0 : s)), 1400);
    } catch (e) {
      console.error("Update failed", e);
      // toast already shown
    } finally {
      setSavingId(0);
    }
  };

  if (loading) {
    return (
      <>
        <Toaster
          position="top-center"
          toastOptions={{ style: { direction: "rtl", fontFamily: "inherit" } }}
        />
        <div dir="rtl" className="flex flex-wrap gap-6 items-start mt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={`sk-${i}`} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{ style: { direction: "rtl", fontFamily: "inherit" } }}
      />
      <div dir="rtl" className="flex flex-wrap gap-6 items-start mt-8">
        {parties.map((party) => (
          <div
            key={party.id}
            className="flex flex-col gap-2 border-2 rounded p-4 w-[calc(25%-24px)] min-w-[260px]"
            style={{ borderColor: party.color }}
            aria-busy={savingId === party.id || isPending}
          >
            <h2
              className="text-white font-bold w-fit px-4 py-1 rounded text-xl"
              style={{ backgroundColor: party.color }}
            >
              {party.arabicName}
            </h2>

            <form action={updateAction} className="mt-2 space-y-4" autoComplete="off">
              <input type="hidden" name="id" value={party.id} />

              {/* Votes */}
              <div className="flex items-center gap-2">
                <label className="min-w-24" htmlFor={`votes-${party.id}`}>
                  عدد الأصوات:
                </label>
                <input
                  id={`votes-${party.id}`}
                  className="border py-2 px-2 mr-1 w-44 text-xl rounded outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[color:var(--ring,rgba(0,0,0,0.12))] text-right"
                  type="text"
                  name="numberOfVoting"
                  inputMode="numeric"
                  value={draft[party.id]?.votes ?? ""}
                  onChange={(e) => onChangeVotes(party.id, e.target.value)}
                  required
                  /* ⛔ turn off suggestions/autocomplete/autocorrect */
                  autoComplete="off"
                  aria-autocomplete="none"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>

              {/* Chairs */}
              <div className="flex items-center gap-2">
                <label className="min-w-24" htmlFor={`chairs-${party.id}`}>
                  عدد المقاعد:
                </label>
                <input
                  id={`chairs-${party.id}`}
                  className="border py-2 px-2 mr-1 w-24 text-xl rounded outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[color:var(--ring,rgba(0,0,0,0.12))] text-right"
                  type="text"
                  name="thisElecChairs"
                  inputMode="numeric"
                  value={draft[party.id]?.chairs ?? ""}
                  onChange={(e) => onChangeChairs(party.id, e.target.value)}
                  required
                  /* ⛔ turn off suggestions/autocomplete/autocorrect */
                  autoComplete="off"
                  aria-autocomplete="none"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>

              <button
                type="submit"
                disabled={savingId === party.id || isPending}
                className="text-white font-bold w-full flex justify-center items-center text-xl rounded mt-6 cursor-pointer py-2 disabled:opacity-60"
                style={{ backgroundColor: party.color, ["--ring"]: party.color }}
                aria-live="polite"
              >
                {savingId === party.id ? "جارٍ التحديث…" : "تحديث"}
              </button>

              {/* subtle status line */}
              <p className="h-5 text-sm text-green-700">
                {statusId === party.id ? "تم الحفظ بنجاح" : ""}
              </p>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
