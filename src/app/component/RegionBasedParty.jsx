"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  getAllParties,
  editPartyRegion,
  loadPartyRegion,
} from "../actions/getParties";
import { Toaster, toast } from "react-hot-toast";

/* ---------------- number helpers (robust) ---------------- */
const fmt = new Intl.NumberFormat("en-US");
const onlyDigits = (s) => String(s ?? "").replace(/[^\d]/g, "");

// Format a string of digits like "12345" -> "12,345"
const fmtDigits = (digits) => (digits === "" ? "" : fmt.format(Number(digits)));

// Normalize any unknown input into a clean digits string
const toDigits = (v) => {
  if (v == null) return "";
  if (typeof v === "bigint") return v.toString(); // guaranteed digits
  if (typeof v === "number")
    return Number.isFinite(v) ? Math.trunc(v).toString() : "";
  // strings (remove commas, spaces, trailing 'n', etc.)
  const s = String(v).replace(/[^\d]/g, ""); // keep digits only
  return s;
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

/* ---------------- regions ---------------- */
const iraqRegions = {
  IQ_BA: "البصرة",
  IQ_AN: "الأنبار",
  IQ_DI: "ديالى",
  IQ_SU: "السليمانية",
  IQ_WA: "واسط",
  IQ_MU: "المثنى",
  IQ_KA: "كربلاء",
  IQ_MA: "ميسان",
  IQ_NA: "النجف",
  IQ_QA: "القادسية",
  IQ_BB: "بابل",
  IQ_BG: "بغداد",
  IQ_DA: "دهوك",
  IQ_DQ: "ذي قار",
  IQ_NI: "نينوى",
  IQ_SD: "صلاح الدين",
  IQ_KI: "كركوك",
  IQ_AR: "أربيل",
};

export default function RegionBasedParty() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getAllParties();
        if (!alive) return;
        setParties(Array.isArray(data) ? data : []);
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
          <PartyRow key={party.id} party={party} />
        ))}
      </div>
    </>
  );
}

function PartyRow({ party }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local UI state
  const [regionCode, setRegionCode] = useState(""); // e.g. "IQ_AN"
  const [votes, setVotes] = useState(""); // formatted with commas
  const [chairs, setChairs] = useState(""); // formatted with commas
  const [saving, setSaving] = useState(false);

  /**
   * IMPORTANT: Adapt the action signature for useActionState.
   * useActionState calls: action(prevState, formData)
   * but your server action expects (formData).
   */
  const actionAdapter = async (_prev, formData) => {
    // You can also convert the region code for DB here if needed:
    // formData.set("regionCode", String(formData.get("regionCode")).replaceAll("_", "-"));
    return loadPartyRegion(formData);
  };

  const [regionState, loadRegionAction, loadingRegion] = useActionState(
    loadPartyRegion,
    null
  );

  // Fill inputs when the action returns (do NOT gate on "ok")
  useEffect(() => {
    if (!regionCode) {
      setVotes("");
      setChairs("");
      return;
    }
    if (loadingRegion) return; // wait until the action resolves
    if (regionState == null) return;

    // Support both { data: {...} } and flat {...}
    const src = regionState.data ?? regionState;

    // Extract numbers from any key shape and sanitize
    const rawVotes =
      src?.numberOfVoting ??
      src?.votes ??
      src?.voteCount ??
      src?.number_of_voting;
    const rawChairs =
      src?.thisElecChairs ??
      src?.chairs ??
      src?.seatCount ??
      src?.this_elec_chairs;

    const votesDigits = toDigits(rawVotes);
    const chairsDigits = toDigits(rawChairs);

    // If server returned something valid, format; else keep empty (not 0)
    setVotes(votesDigits ? fmtDigits(votesDigits) : "");
    setChairs(chairsDigits ? fmtDigits(chairsDigits) : "");
  }, [regionCode, regionState, loadingRegion]);

  // Region changed → call server action INSIDE a transition
  const onRegionChange = (e) => {
    const code = e.target.value;
    setRegionCode(code);
    setVotes("");
    setChairs("");
    if (!code) return;

    startTransition(() => {
      const fd = new FormData();
      fd.set("partyId", String(party.id));
      fd.set("regionCode", code); // keep underscores in UI; adapt in actionAdapter if DB needs '-'
      loadRegionAction(fd);
    });
  };

  // Inputs with commas (RTL, right-aligned, numeric-only)
  const onChangeVotes = (val) => {
    const digits = onlyDigits(val);
    setVotes(fmtDigits(digits));
  };
  const onChangeChairs = (val) => {
    const digits = onlyDigits(val);
    setChairs(fmtDigits(digits));
  };

  // Submit edits to DB (keeps underscores in UI)
  const updateAction = async (formData) => {
    setSaving(true);

    // normalize numbers (strip commas)
    const votesStr = String(formData.get("numberOfVoting") ?? "").replace(
      /,/g,
      ""
    );
    const chairsStr = String(formData.get("thisElecChairs") ?? "").replace(
      /,/g,
      ""
    );
    formData.set("numberOfVoting", votesStr);
    formData.set("thisElecChairs", chairsStr);

    try {
      await toast.promise(
        editPartyRegion(formData),
        {
          loading: "جارٍ الحفظ…",
          success: "تم الحفظ بنجاح",
          error: "لم يتم حفظ التغييرات",
        },
        { style: { direction: "rtl" }, success: { duration: 1600 } }
      );
      startTransition(() => router.refresh());
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const disabledInputs = !regionCode || loadingRegion;

  return (
    <div
      className="flex flex-col gap-2 border-2 rounded p-4 w-[calc(25%-24px)] min-w-[260px]"
      style={{ borderColor: party.color }}
      aria-busy={saving || isPending}
    >
      <h2
        className="text-white font-bold w-fit px-4 py-1 rounded text-xl"
        style={{ backgroundColor: party.color }}
      >
        {party.arabicName}
      </h2>

      {/* Region loader (server action via useActionState) */}
      <form action={loadRegionAction} className="mt-2" autoComplete="off">
        <input type="hidden" name="partyId" value={party.id} />
        <div className="flex items-center gap-2">
          <label className="min-w-24" htmlFor={`region-${party.id}`}>
            المحافظة:
          </label>
          <select
            id={`region-${party.id}`}
            name="regionCode"
            className="border py-1 px-2 mr-1 w-40 text-lg rounded"
            value={regionCode}
            onChange={onRegionChange}
            autoComplete="off"
            aria-autocomplete="none"
          >
            <option value="">اختر المحافظة</option>
            {Object.entries(iraqRegions).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          {loadingRegion && (
            <span className="text-sm text-gray-500">…جاري التحميل</span>
          )}
        </div>
      </form>

      {/* Update form (writes to DB) */}
      <form action={updateAction} className="mt-4 space-y-4" autoComplete="off">
        <input type="hidden" name="id" value={party.id} />
        <input type="hidden" name="regionCode" value={regionCode} />

        <div className="flex items-center gap-2">
          <label className="min-w-24" htmlFor={`votes-${party.id}`}>
            عدد الأصوات:
          </label>
          <input
            id={`votes-${party.id}`}
            className="border py-2 px-2 mr-1 w-44 text-xl rounded outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[color:var(--ring,rgba(0,0,0,0.12))] text-right disabled:bg-gray-100"
            type="text"
            name="numberOfVoting"
            inputMode="numeric"
            value={votes}
            onChange={(e) => onChangeVotes(e.target.value)}
            disabled={disabledInputs}
            placeholder={disabledInputs ? "" : "0"}
            required
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

        <div className="flex items-center gap-2">
          <label className="min-w-24" htmlFor={`chairs-${party.id}`}>
            عدد المقاعد:
          </label>
          <input
            id={`chairs-${party.id}`}
            className="border py-2 px-2 mr-1 w-24 text-xl rounded outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[color:var(--ring,rgba(0,0,0,0.12))] text-right disabled:bg-gray-100"
            type="text"
            name="thisElecChairs"
            inputMode="numeric"
            value={chairs}
            onChange={(e) => onChangeChairs(e.target.value)}
            disabled={disabledInputs}
            placeholder={disabledInputs ? "" : "0"}
            required
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
          disabled={saving || isPending || !regionCode}
          className="text-white font-bold w-full flex justify-center items-center text-xl rounded mt-6 cursor-pointer py-2 disabled:opacity-60"
          style={{ backgroundColor: party.color, ["--ring"]: party.color }}
        >
          {saving ? "جارٍ التحديث…" : "تحديث"}
        </button>
      </form>
    </div>
  );
}
