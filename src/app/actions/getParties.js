// src/app/actions/getParties.js
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPartiesByRegion(regionCode) {
  const parties = await prisma.party.findMany({
    where: {
      locations: {
        some: { regionCode },
      },
    },
    include: {
      locations: {
        where: { regionCode },
      },
    },
  });

  return parties
    .sort(
      (a, b) =>
        Number(b.locations[0]?.numberOfVoting ?? 0) -
        Number(a.locations[0]?.numberOfVoting ?? 0)
    )
    .slice(0, 6);
}

export async function getTopParties() {
  return prisma.party.findMany({
    orderBy: {
      numberOfVoting: "desc",
    },
    take: 6,
    select: {
      id: true,
      arabicName: true,
      abbr: true,
      numberOfVoting: true,
      color: true,
      thisElecChairs: true,
      lastElecChairs: true,
    },
  });
}

export async function getParties() {
  return prisma.party.findMany({
    include: {
      locations: true,
    },
  });
}

export async function getAllParties() {
  return prisma.party.findMany({
    orderBy: {
      id: "asc",
    },
  });
}

export async function editParty(formData) {
  const id = Number(formData.get("id"));
  const numberOfVoting = Number(formData.get("numberOfVoting"));
  const thisElecChairs = Number(formData.get("thisElecChairs"));

  await prisma.party.update({
    where: { id },
    data: { numberOfVoting, thisElecChairs },
  });

  // Optional (helps if you later move fetching to RSC/ISR/tagged fetch):
  revalidatePath("/"); // <-- set this to the actual route that renders this UI

  return { ok: true, id, numberOfVoting, thisElecChairs };
}

// src/app/actions/getParties.js

/* keep your other exports (getPartiesByRegion, getTopParties, getParties, getAllParties) as-is */

/**
 * Load per-region numbers for a party:
 * - Votes from Location.numberOfVoting
 * - Chairs from Party.thisElecChairs (party-level, not regional)
 *
 * Compatible with useActionState(action, initial):
 *   action(prevState, formData)
 */


// src/app/actions/getParties.js

/* keep your other exports (getPartiesByRegion, getTopParties, getParties, getAllParties) as-is */

/**
 * Load per-region numbers for a party:
 * - Votes from Location.numberOfVoting
 * - Chairs from Party.thisElecChairs (party-level, not regional)
 *
 * Compatible with useActionState(action, initial):
 *   action(prevState, formData)
 */
export async function loadPartyRegion(_prevState, formData) {
  try {
    const partyId = Number(formData.get("partyId"));
    const rawCode = String(formData.get("regionCode") || "").trim();

    if (!partyId || !rawCode) {
      return { ok: false, error: "Missing params" };
    }

    // Accept both underscore & hyphen variants when reading
    const codeUnderscore = rawCode.replace(/-/g, "_");
    const codeHyphen = rawCode.replace(/_/g, "-");

    // Read location (votes) and party (chairs) in one round-trip
    const loc = await prisma.$transaction([
      prisma.location.findFirst({
        where: {
          partyId,
          regionCode: { in: [rawCode, codeUnderscore, codeHyphen] },
        },
        select: { numberOfVoting: true, thisElecChairs: true},
      })
    ]);

    console.log(loc)

    // If no location exists yet → return votes = 0 (or you can fallback to party.total if you prefer)
    return {
      ok: true,
      numberOfVoting: loc[0]?.numberOfVoting ?? 0,
      thisElecChairs: loc[0]?.thisElecChairs ?? 0,
      source: loc ? "location" : "no-location",
    };
  } catch (e) {
    console.error("loadPartyRegion error:", e);
    return { ok: false, error: "Server error" };
  }
}

/**
 * Edit region-based votes & party chairs:
 * - Upsert Location { numberOfVoting } for (partyId, regionCode)
 * - Update Party.thisElecChairs
 * Region code is normalized to underscores on write (choose one convention).
 */
export async function editPartyRegion(formData) {
  const id = Number(formData.get("id"));
  const rawCode = String(formData.get("regionCode") || "").trim();

  // Normalize WRITE convention (choose underscores; change if you prefer hyphens)
  const regionCode = rawCode.replace(/-/g, "_");

  const votesStr = String(formData.get("numberOfVoting") ?? "").replace(/,/g, "");
  const chairsStr = String(formData.get("thisElecChairs") ?? "").replace(/,/g, "");

  const numberOfVoting = votesStr ? Number(votesStr) : 0; // Int column in your schema
  const thisElecChairs = chairsStr ? Number(chairsStr) : 0;

  await prisma.$transaction(async (tx) => {
    // Upsert regional votes
    const existing = await tx.location.findFirst({
      where: { partyId: id, regionCode },
      select: { id: true },
    });

    if (existing) {
      await tx.location.update({
        where: { id: existing.id },
        data: { numberOfVoting, thisElecChairs },
      });
    } else {
      await tx.location.create({
        data: { partyId: id, regionCode, numberOfVoting, thisElecChairs },
      });
    }

  });

  // Revalidate the page that renders this UI
  revalidatePath("/"); // change to your actual route if needed

  return { ok: true };
}
