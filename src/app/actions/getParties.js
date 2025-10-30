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

export async function editPartyRegion(formData) {
  const id = Number(formData.get("id"));
  const regionCode = String(formData.get("regionCode"))
  const numberOfVoting = Number(formData.get("numberOfVoting"));

  await prisma.location.update({
    where: { partyId: id, regionCode },
    data: { numberOfVoting },
  });

  // Optional (helps if you later move fetching to RSC/ISR/tagged fetch):
  revalidatePath("/"); // <-- set this to the actual route that renders this UI

  return { ok: true, id, numberOfVoting };
}