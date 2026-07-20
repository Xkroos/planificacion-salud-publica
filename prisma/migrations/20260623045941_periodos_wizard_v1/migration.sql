-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('CONTRATADO', 'ORDINARIO');

-- CreateEnum
CREATE TYPE "Dedicacion" AS ENUM ('HP', 'MT', 'TC', 'DE');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'MULTIMODAL');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'JUSTIFICADO');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('FEMENINO', 'MASCULINO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regiones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "regiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas_territoriales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "coordinador" TEXT,
    "enlace" TEXT,
    "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "aulas_territoriales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "trimestre" TEXT NOT NULL,
    "seccion" TEXT NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "fechaInicioEstimada" TIMESTAMP(3),
    "fechaFinEstimada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "contacto" TEXT,
    "email" TEXT,
    "numeroCuenta" TEXT,
    "categoria" "Categoria" NOT NULL,
    "dedicacion" "Dedicacion" NOT NULL,
    "aulaOrigenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_curriculares" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creditos" INTEGER NOT NULL,
    "horas" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_curriculares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cronogramas" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "aulaTerritorialId" TEXT NOT NULL,
    "seccionNumero" INTEGER NOT NULL DEFAULT 1,
    "vocero" TEXT,
    "telefonoVocero" TEXT,
    "emailVocero" TEXT,
    "participantesFem" INTEGER NOT NULL DEFAULT 0,
    "participantesMasc" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cronogramas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_docente" (
    "id" TEXT NOT NULL,
    "cronogramaId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "lugar" TEXT,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "uc" INTEGER NOT NULL,
    "cantHoras" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "asignaciones_docente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechas_encuentro" (
    "id" TEXT NOT NULL,
    "asignacionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "modalidad" "Modalidad" NOT NULL DEFAULT 'PRESENCIAL',

    CONSTRAINT "fechas_encuentro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participantes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "cedula" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "genero" "Genero" NOT NULL,
    "unidadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cronograma_participantes" (
    "id" TEXT NOT NULL,
    "cronogramaId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cronograma_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "fechaEncuentroId" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL DEFAULT 'AUSENTE',
    "observacion" TEXT,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_sistema" (
    "id" TEXT NOT NULL,
    "registroDocentesAbierto" BOOLEAN NOT NULL DEFAULT false,
    "asignacionCargaAbierta" BOOLEAN NOT NULL DEFAULT false,
    "inscripcionParticipantesAbierta" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "regiones_nombre_key" ON "regiones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_anio_numero_seccion_key" ON "periodos"("anio", "numero", "seccion");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_cedula_key" ON "docentes"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_email_key" ON "docentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cronogramas_periodoId_aulaTerritorialId_seccionNumero_key" ON "cronogramas"("periodoId", "aulaTerritorialId", "seccionNumero");

-- CreateIndex
CREATE UNIQUE INDEX "cronograma_participantes_cronogramaId_participanteId_key" ON "cronograma_participantes"("cronogramaId", "participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_participanteId_fechaEncuentroId_key" ON "asistencias"("participanteId", "fechaEncuentroId");

-- AddForeignKey
ALTER TABLE "aulas_territoriales" ADD CONSTRAINT "aulas_territoriales_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_aulaOrigenId_fkey" FOREIGN KEY ("aulaOrigenId") REFERENCES "aulas_territoriales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas" ADD CONSTRAINT "cronogramas_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronogramas" ADD CONSTRAINT "cronogramas_aulaTerritorialId_fkey" FOREIGN KEY ("aulaTerritorialId") REFERENCES "aulas_territoriales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_docente" ADD CONSTRAINT "asignaciones_docente_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "cronogramas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_docente" ADD CONSTRAINT "asignaciones_docente_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_docente" ADD CONSTRAINT "asignaciones_docente_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades_curriculares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechas_encuentro" ADD CONSTRAINT "fechas_encuentro_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_docente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades_curriculares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_participantes" ADD CONSTRAINT "cronograma_participantes_cronogramaId_fkey" FOREIGN KEY ("cronogramaId") REFERENCES "cronogramas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cronograma_participantes" ADD CONSTRAINT "cronograma_participantes_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_fechaEncuentroId_fkey" FOREIGN KEY ("fechaEncuentroId") REFERENCES "fechas_encuentro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
