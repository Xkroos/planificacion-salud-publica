-- CreateEnum
CREATE TYPE "CondicionAcademica" AS ENUM ('REGULAR', 'APROBADO', 'REPROBADO', 'RETIRADO', 'INACTIVO');

-- CreateTable
CREATE TABLE "inscripciones_periodo" (
    "id" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "trimestre" TEXT NOT NULL,
    "condicion" "CondicionAcademica" NOT NULL DEFAULT 'REGULAR',
    "notaPromedio" DOUBLE PRECISION,
    "aulaTerritorialId" TEXT,
    "seccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripciones_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_periodo_participanteId_periodoId_key" ON "inscripciones_periodo"("participanteId", "periodoId");

-- CreateIndex
CREATE INDEX "inscripciones_periodo_participanteId_trimestre_idx" ON "inscripciones_periodo"("participanteId", "trimestre");

-- AddForeignKey
ALTER TABLE "inscripciones_periodo" ADD CONSTRAINT "inscripciones_periodo_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_periodo" ADD CONSTRAINT "inscripciones_periodo_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

