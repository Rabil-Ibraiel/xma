-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "arabicName" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "numberOfVoting" INTEGER NOT NULL,
    "lastYearChairs" INTEGER NOT NULL,
    "thisYearChairs" INTEGER NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "regionCode" TEXT NOT NULL,
    "numberOfVoting" INTEGER NOT NULL,
    "partyId" INTEGER NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_abbr_key" ON "Party"("abbr");

-- CreateIndex
CREATE INDEX "Party_abbr_idx" ON "Party"("abbr");

-- CreateIndex
CREATE INDEX "Location_partyId_idx" ON "Location"("partyId");

-- CreateIndex
CREATE INDEX "Location_regionCode_idx" ON "Location"("regionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Location_partyId_regionCode_key" ON "Location"("partyId", "regionCode");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
