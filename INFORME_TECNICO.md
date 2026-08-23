# INFORME TÉCNICO
## Sistema de Planificación Académica — Decanato de Postgrado, Salud Pública
### Universidad Nacional Experimental Rómulo Gallegos (UNERG)

---

**Fecha de Elaboración:** Agosto 2026  
**Versión del Sistema:** 0.1.0  
**Tipo de Documento:** Informe Técnico Descriptivo  
**Dirigido a:** Coordinación Nacional del Programa de Salud Pública — Decanato de Postgrado UNERG

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Planteamiento del Problema](#2-planteamiento-del-problema)
3. [Objetivos del Sistema](#3-objetivos-del-sistema)
4. [Descripción General del Sistema](#4-descripción-general-del-sistema)
5. [Beneficios Institucionales](#5-beneficios-institucionales)
6. [Arquitectura del Sistema](#6-arquitectura-del-sistema)
7. [Tecnologías Utilizadas](#7-tecnologías-utilizadas)
8. [Modelo de Base de Datos](#8-modelo-de-base-de-datos)
9. [Módulos Funcionales](#9-módulos-funcionales)
10. [Seguridad y Control de Acceso](#10-seguridad-y-control-de-acceso)
11. [Metodología de Desarrollo](#11-metodología-de-desarrollo)
12. [Requisitos del Sistema](#12-requisitos-del-sistema)
13. [Conclusiones](#13-conclusiones)

---

## 1. Introducción

El presente informe técnico describe el **Sistema de Planificación Académica de Salud Pública**, una aplicación web desarrollada para el Decanato de Postgrado de la Universidad Nacional Experimental Rómulo Gallegos (UNERG). Este sistema fue concebido con el propósito de digitalizar, centralizar y automatizar los procesos de planificación académica del programa de Especialización en Gerencia de Salud Pública, los cuales anteriormente se realizaban de forma completamente manual mediante hojas de cálculo de Microsoft Excel.

El sistema abarca la gestión integral del ciclo de planificación académica: desde la configuración de periodos académicos y la distribución geográfica de sedes (Aulas Territoriales), hasta la asignación de carga docente, el control de asistencia de participantes, la generación automatizada de cronogramas y la elaboración de estructuras de costos e informes estadísticos exportables en formato PDF.

---

## 2. Planteamiento del Problema

Antes de la implementación de este sistema, la Coordinación Nacional del Programa de Salud Pública gestionaba toda la planificación académica a través de **archivos individuales de Microsoft Excel**, lo cual generaba las siguientes problemáticas:

| Problema | Descripción |
|----------|-------------|
| **Dispersión de información** | Los datos de docentes, participantes, cronogramas y costos se encontraban distribuidos en múltiples archivos de Excel sin un repositorio centralizado, lo que dificultaba la consulta y consolidación de la información. |
| **Duplicidad de datos** | Al no existir un control unificado, era frecuente la existencia de registros duplicados o inconsistentes de docentes y participantes entre diferentes hojas de cálculo. |
| **Errores humanos en cálculos** | Las estructuras de costos, viáticos, honorarios profesionales y gastos administrativos se calculaban manualmente, exponiéndose a errores aritméticos y omisiones. |
| **Ausencia de trazabilidad** | No existía un registro auditable de quién modificaba los datos, cuándo lo hacía ni qué cambios realizaba, dificultando la rendición de cuentas. |
| **Dificultad para generar reportes** | La elaboración de informes consolidados (por región, por trimestre, por docente) requería un trabajo manual intensivo de consolidación entre múltiples archivos. |
| **Falta de control de acceso** | Cualquier persona con acceso al archivo de Excel podía modificar cualquier dato sin restricciones ni registro de la acción. |
| **Demora en la toma de decisiones** | La falta de indicadores en tiempo real impedía a la coordinación tomar decisiones oportunas basadas en datos actualizados. |
| **Riesgo de pérdida de datos** | Los archivos de Excel almacenados localmente o en memorias USB eran susceptibles a pérdida, corrupción o eliminación accidental. |

---

## 3. Objetivos del Sistema

### 3.1 Objetivo General

Desarrollar e implementar un sistema web de planificación académica que centralice, automatice y optimice los procesos administrativos y académicos del programa de Especialización en Gerencia de Salud Pública del Decanato de Postgrado de la UNERG, sustituyendo los procedimientos manuales basados en hojas de cálculo de Excel.

### 3.2 Objetivos Específicos

1. **Centralizar la información académica** en una base de datos relacional única que almacene de forma estructurada los datos de docentes, participantes, unidades curriculares, cronogramas, regiones y aulas territoriales.

2. **Automatizar la generación de cronogramas** de planificación académica por periodo, trimestre, región y sección, eliminando la creación manual de cronogramas en Excel.

3. **Digitalizar la gestión de docentes** incluyendo su registro, clasificación por categoría (Contratado/Ordinario) y dedicación (HP, MT, TC, DE), asignación a regiones y aulas territoriales, y control de estado (activo/inactivo).

4. **Implementar un módulo de estructura de costos** que calcule automáticamente los gastos de factibilidad, viáticos, honorarios profesionales, preinscripción, inscripción, limpieza, vigilancia y aportes de coordinación por aula territorial.

5. **Desarrollar un módulo de estadísticas e indicadores** con gráficos interactivos (barras, tortas) que presenten métricas clave como distribución de participantes por género, docentes por dedicación, cronogramas por modalidad, entre otros.

6. **Automatizar la generación de reportes PDF** de cronogramas de planificación y estructuras de costos con formato institucional estandarizado.

7. **Implementar un sistema de control de acceso basado en roles** (Administrador y Operador) que garantice la seguridad de los datos y restrinja las operaciones según los privilegios del usuario.

8. **Establecer un sistema de bitácora de auditoría** que registre todas las acciones realizadas en el sistema (inicio de sesión, creación, modificación y eliminación de registros) para fines de trazabilidad y rendición de cuentas.

9. **Gestionar periodos académicos** con configuración de trimestres, modalidades (Presencial, Virtual, Multimodal), fechas estimadas y estados (Activo/Cerrado).

10. **Controlar la asistencia de participantes** por fecha de encuentro y unidad curricular, con estados de asistencia (Presente, Ausente, Justificado).

11. **Gestionar expedientes históricos** que permitan consultar la información de periodos académicos anteriores cerrados.

---

## 4. Descripción General del Sistema

El **Sistema de Planificación Académica de Salud Pública** es una aplicación web de tipo _Single Page Application_ (SPA) con renderizado del lado del servidor (SSR) y del lado del cliente (CSR), construida sobre el framework **Next.js 16**. La aplicación funciona como un panel de administración (_dashboard_) con autenticación obligatoria, donde los usuarios acceden según su rol asignado.

### Flujo General de Trabajo

```
┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
│  1. Periodo  │───▶│ 2. Regiones y    │───▶│ 3. Docentes y     │
│  Académico   │    │ Aulas Territ.    │    │ Unidades Curric.  │
└──────────────┘    └──────────────────┘    └───────────────────┘
                                                      │
       ┌──────────────────────────────────────────────┘
       ▼
┌──────────────────┐    ┌───────────────────┐    ┌────────────────┐
│ 4. Cronogramas   │───▶│ 5. Asignación de  │───▶│ 6. Participan- │
│ de Planificación │    │ Carga Docente     │    │ tes y Asisten. │
└──────────────────┘    └───────────────────┘    └────────────────┘
                                                        │
       ┌────────────────────────────────────────────────┘
       ▼
┌──────────────────┐    ┌───────────────────┐
│ 7. Estructura    │───▶│ 8. Reportes PDF   │
│ de Costos        │    │ y Estadísticas    │
└──────────────────┘    └───────────────────┘
```

1. Se configura un **Periodo Académico** (año, número, modalidad, trimestres habilitados).
2. Se registran las **Regiones** (estados de Venezuela) y sus **Aulas Territoriales** (sedes) con coordinadores y costos asociados.
3. Se registran los **Docentes** con su información personal, categoría, dedicación y ubicación geográfica.
4. Se generan los **Cronogramas** seleccionando periodo, trimestre, región, aula y unidades curriculares.
5. Se realizan las **Asignaciones de Carga Docente** (materias, horarios, fechas de encuentro).
6. Se gestionan los **Participantes** y se registra su **Asistencia** por encuentro.
7. Se calculan y configuran las **Estructuras de Costos** y **Viáticos**.
8. Se generan **Reportes PDF** y se consultan las **Estadísticas** interactivas del sistema.

---

## 5. Beneficios Institucionales

La implementación del sistema representa una transformación significativa frente al proceso manual anterior basado en Excel. A continuación se detallan los beneficios concretos:

### 5.1 Beneficios Operativos

| Aspecto | Antes (Excel) | Ahora (Sistema Web) |
|---------|---------------|---------------------|
| **Registro de Docentes** | Múltiples hojas de cálculo sin relación entre ellas | Base de datos única con validación de duplicados por cédula y correo |
| **Creación de Cronogramas** | Creación manual copiando plantillas de Excel | Generador automático que crea cronogramas con materias y secciones |
| **Asignación de Carga** | Escritura manual en celdas de Excel | Interfaz visual con asignación de docentes a unidades curriculares |
| **Cálculo de Costos** | Fórmulas manuales de Excel propensas a error | Cálculo automático basado en tabulador, UC, horas y viáticos configurados |
| **Generación de Reportes** | Formateo manual de tablas en Excel/Word | Generación instantánea de PDF con formato institucional estandarizado |
| **Control de Asistencia** | Listas en papel o Excel separado | Registro digital por fecha de encuentro con estados (Presente/Ausente/Justificado) |
| **Consulta de Estadísticas** | Conteos manuales y gráficos manuales en Excel | Dashboard interactivo con gráficos en tiempo real filtrados por periodo/región/aula |

### 5.2 Beneficios Estratégicos

- **Centralización:** Toda la información académica reside en una única base de datos relacional PostgreSQL, eliminando la dispersión de archivos.
- **Integridad de datos:** Las restricciones de unicidad, claves foráneas y validaciones del ORM garantizan la consistencia de los registros.
- **Trazabilidad total:** La bitácora de seguridad registra cada acción realizada, incluyendo el usuario, módulo, tipo de acción y detalles descriptivos con marca de tiempo.
- **Acceso controlado:** El sistema de roles (Administrador/Operador) delimita qué operaciones puede realizar cada usuario, con interruptores configurables para abrir/cerrar procesos (registro de docentes, asignación de carga, inscripción de participantes).
- **Accesibilidad:** Al ser una aplicación web, es accesible desde cualquier dispositivo con navegador, sin necesidad de instalar software adicional.
- **Escalabilidad:** La arquitectura Next.js + PostgreSQL permite crecer horizontal y verticalmente según las necesidades futuras.
- **Recuperación ante desastres:** Los datos almacenados en PostgreSQL pueden respaldarse y restaurarse de forma confiable, a diferencia de archivos Excel locales.

### 5.3 Beneficios en Ahorro de Tiempo

- **Generación de cronogramas:** De ~2 horas manuales por cronograma a **segundos** con el generador automático.
- **Elaboración de estructura de costos PDF:** De ~1 hora de formateo manual a **generación instantánea** con un clic.
- **Consolidación de estadísticas:** De ~medio día de conteos manuales a **consulta en tiempo real** con filtros dinámicos.
- **Búsqueda de información de docentes/participantes:** De revisión archivo por archivo a **búsqueda instantánea** por nombre, cédula o filtros combinados.

---

## 6. Arquitectura del Sistema

El sistema sigue una arquitectura **Full-Stack monolítica** basada en el framework Next.js, que unifica el frontend y el backend en un solo proyecto. La comunicación entre la interfaz de usuario y la base de datos se realiza a través de API Routes internas.

### 6.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE (Navegador)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React 19 + Next.js 16 (App Router)                 │    │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────────────┐  │    │
│  │  │ Dashboard │ │ Módulos  │ │ Componentes UI     │  │    │
│  │  │   Page    │ │  CRUD    │ │ (Sidebar, Modals)  │  │    │
│  │  └───────────┘ └──────────┘ └────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │  Librerías: Recharts, jsPDF, ExcelJS, Lucide  │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (fetch API)
┌──────────────────────────▼──────────────────────────────────┐
│                       SERVIDOR (Next.js)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  API Routes (src/app/api/*)                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│    │
│  │  │ docentes │ │cronograma│ │ asignaciones, aulas, ││    │
│  │  │  route   │ │  route   │ │ periodos, estadístic.││    │
│  │  └──────────┘ └──────────┘ └──────────────────────┘│    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  NextAuth v5 (Autenticación JWT + Sesiones)         │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Prisma ORM v7.8 (Driver Adapter: @prisma/adapter-pg)│   │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL (TCP/IP, puerto 5432)
┌──────────────────────────▼──────────────────────────────────┐
│                    BASE DE DATOS                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PostgreSQL                                         │    │
│  │  Base de datos: unerg_db                            │    │
│  │  Esquema: public                                    │    │
│  │  16 tablas, 7 enumeraciones                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Patrón de Diseño

- **App Router (Next.js 16):** Enrutamiento basado en el sistema de archivos con layouts anidados y grupos de rutas.
- **Server Components + Client Components:** Las páginas del dashboard combinan componentes de servidor (para la carga inicial de datos) con componentes de cliente (para la interactividad y estado).
- **API REST interna:** Endpoints bajo `src/app/api/` que manejan las operaciones CRUD y la lógica de negocio.
- **ORM Prisma:** Capa de abstracción sobre la base de datos que garantiza type-safety y migraciones controladas.

---

## 7. Tecnologías Utilizadas

### 7.1 Stack Tecnológico Principal

| Capa | Tecnología | Versión | Propósito |
|------|------------|---------|-----------|
| **Framework Full-Stack** | Next.js | 16.2.9 | Framework React con SSR/SSG, App Router, API Routes |
| **Biblioteca UI** | React | 19.2.4 | Construcción de la interfaz de usuario reactiva |
| **Lenguaje** | TypeScript | 5.x | Tipado estático para mayor robustez del código |
| **Base de Datos** | PostgreSQL | — | Sistema de gestión de base de datos relacional |
| **ORM** | Prisma | 7.8.0 | Mapeo objeto-relacional con migraciones y type-safety |
| **Autenticación** | NextAuth.js | 5.0.0-beta.31 | Autenticación con credenciales, JWT y sesiones |
| **Estilos** | TailwindCSS + CSS personalizado | 4.x | Framework de utilidades CSS y estilos personalizados |

### 7.2 Librerías de Frontend

| Librería | Versión | Propósito |
|----------|---------|-----------|
| **Recharts** | 3.10.1 | Gráficos interactivos (barras, tortas, líneas) para el módulo de estadísticas |
| **Lucide React** | 1.21.0 | Sistema de iconos SVG consistente y moderno |
| **React Hook Form** | 7.80.0 | Gestión de formularios con validación |
| **Zod** | 4.4.3 | Validación de esquemas y datos de entrada |
| **Radix UI** | Varios | Componentes accesibles (Dialog, Select, Dropdown, Toast, Avatar, Label, Separator) |
| **React Hot Toast** | 2.6.0 | Notificaciones tipo toast para feedback al usuario |
| **date-fns** | 4.4.0 | Manipulación y formateo de fechas |
| **clsx** + **tailwind-merge** | — | Utilidades para composición condicional de clases CSS |
| **class-variance-authority** | 0.7.1 | Variantes de estilos para componentes reutilizables |

### 7.3 Librerías de Generación de Documentos

| Librería | Versión | Propósito |
|----------|---------|-----------|
| **jsPDF** | 4.2.1 | Generación de documentos PDF en el navegador |
| **jspdf-autotable** | 5.0.8 | Tablas automáticas en documentos PDF |
| **html2canvas** | 1.4.1 | Captura de elementos HTML como imágenes para PDF |
| **ExcelJS** | 4.4.0 | Generación y manipulación de archivos Excel |
| **file-saver** | 2.0.5 | Descarga de archivos generados en el navegador |
| **xlsx (SheetJS)** | 0.18.5 | Lectura y escritura de archivos Excel |

### 7.4 Librerías de Backend y Seguridad

| Librería | Versión | Propósito |
|----------|---------|-----------|
| **bcryptjs** | 3.0.3 | Hashing seguro de contraseñas (bcrypt con salt rounds=12) |
| **pg** | 8.22.0 | Driver nativo de PostgreSQL para Node.js |
| **@prisma/adapter-pg** | 7.8.0 | Adaptador Prisma para PostgreSQL con driver nativo |
| **dotenv** | 17.4.2 | Gestión de variables de entorno |

### 7.5 Herramientas de Desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **ESLint** | Análisis estático de código y cumplimiento de estándares |
| **tsx** | Ejecución directa de TypeScript para scripts (seed, pruebas) |
| **PostCSS** | Procesamiento de CSS |
| **@tailwindcss/postcss** | Plugin PostCSS para TailwindCSS v4 |

---

## 8. Modelo de Base de Datos

### 8.1 Motor de Base de Datos

Se utiliza **PostgreSQL** como sistema de gestión de base de datos relacional, seleccionado por su robustez, soporte para tipos de datos avanzados, integridad referencial y capacidad de escalamiento.

- **Base de datos:** `unerg_db`
- **Esquema:** `public`
- **Cadena de conexión:** `postgresql://postgres:***@localhost:5432/unerg_db?schema=public`

### 8.2 Enumeraciones (Tipos ENUM)

El sistema utiliza **7 enumeraciones** para garantizar la integridad de datos categóricos:

| Enum | Valores | Uso |
|------|---------|-----|
| `Rol` | `ADMIN`, `OPERADOR` | Rol del usuario en el sistema |
| `Categoria` | `CONTRATADO`, `ORDINARIO` | Categoría del docente |
| `Dedicacion` | `HP`, `MT`, `TC`, `DE` | Tipo de dedicación docente |
| `Modalidad` | `PRESENCIAL`, `VIRTUAL`, `MULTIMODAL` | Modalidad de la clase/encuentro |
| `EstadoAsistencia` | `PRESENTE`, `AUSENTE`, `JUSTIFICADO` | Estado de asistencia del participante |
| `Genero` | `FEMENINO`, `MASCULINO` | Género del participante |
| `EstadoPeriodo` | `ACTIVO`, `CERRADO` | Estado del periodo académico |

### 8.3 Tablas del Sistema (16 tablas)

#### Diagrama Entidad-Relación

```
                           ┌──────────────────┐
                           │    usuarios       │
                           │──────────────────│
                           │ id, nombre, email │
                           │ password, rol     │
                           │ activo            │
                           └────────┬─────────┘
                                    │ 1:N
                           ┌────────▼─────────┐
                           │    bitacora       │
                           │──────────────────│
                           │ modulo, accion    │
                           │ detalles          │
                           └──────────────────┘

┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   regiones   │ 1:N   │aulas_territoriales│ 1:N  │   cronogramas    │
│──────────────│──────▶│──────────────────│──────▶│──────────────────│
│ nombre       │       │ nombre, coordin. │       │ periodo, trimest.│
│              │       │ costo, viáticos  │       │ sección, vocero  │
│              │       │ preinscripción   │       │ participantes    │
└──────┬───────┘       └──────────────────┘       └───────┬──────────┘
       │ 1:N                                              │ 1:N
       │        ┌──────────────────┐              ┌───────▼──────────┐
       │        │    periodos      │ 1:N          │asignaciones_doc. │
       │        │──────────────────│──────────────▶│──────────────────│
       │        │ año, número      │              │ docente, unidad  │
       │        │ modalidad, trim. │              │ horario, modalid.│
       │        │ tabulador        │              │ UC, horas, orden │
       │        └──────────────────┘              └───────┬──────────┘
       │                                                  │ 1:N
┌──────▼────────────┐                             ┌───────▼──────────┐
│    docentes       │                             │fechas_encuentro  │
│───────────────────│                             │──────────────────│
│ nombre, cédula    │◀────────────────────────────│ fecha, modalidad │
│ contacto, email   │                             └───────┬──────────┘
│ categoría, dedic. │                                     │ 1:N
│ numeroCuenta      │                             ┌───────▼──────────┐
└───────────────────┘                             │   asistencias    │
                                                  │──────────────────│
┌──────────────────┐                              │ participante     │
│ unidades_curric. │                              │ estado, observac.│
│──────────────────│                              └──────────────────┘
│ nombre, créditos │
│ horas, trimestre │                              ┌──────────────────┐
└──────────────────┘                              │  participantes   │
                                                  │──────────────────│
┌──────────────────────┐                          │ nombre, cédula   │
│ configuracion_sistema│                          │ género, teléfono │
│──────────────────────│                          │ email, trimestre  │
│ coord. nacional      │                          │ sección, unidad  │
│ reg. docentes abierto│                          └──────────────────┘
│ asig. carga abierta  │
│ inscr. partic. abierta│
└──────────────────────┘
```

#### Detalle de Tablas

| # | Tabla | Nombre en BD | Descripción | Campos Principales |
|---|-------|--------------|-------------|-------------------|
| 1 | **Usuario** | `usuarios` | Usuarios del sistema con roles | `id`, `nombre`, `email`, `password`, `rol`, `activo` |
| 2 | **Region** | `regiones` | Estados/regiones de Venezuela | `id`, `nombre` (único) |
| 3 | **AulaTerritorial** | `aulas_territoriales` | Sedes académicas por región | `id`, `nombre`, `coordinador`, `enlace`, `costo`, `preinscripcion`, `inscripcion`, `gastosAdministrativos`, `limpieza`, `vigilancia`, `aporteCoordinacion`, `viatico`, `viaticoZona`, `regionId` |
| 4 | **Periodo** | `periodos` | Periodos académicos | `id`, `anio`, `numero`, `modalidad`, `fechaInicioEstimada`, `fechaFinEstimada`, `trimestres[]`, `tabulador`, `resolucion`, `estado` |
| 5 | **Docente** | `docentes` | Personal docente | `id`, `nombre`, `cedula` (único), `contacto`, `email` (único), `numeroCuenta`, `categoria`, `dedicacion`, `aulaOrigenId`, `regionId`, `activo` |
| 6 | **UnidadCurricular** | `unidades_curriculares` | Asignaturas del pensum | `id`, `nombre`, `creditos`, `horas`, `trimestre` |
| 7 | **Seccion** | `secciones` | Secciones académicas | `id`, `nombre` (único) |
| 8 | **Cronograma** | `cronogramas` | Cronograma de planificación por sección | `id`, `periodoId`, `aulaTerritorialId`, `trimestre`, `seccion`, `vocero`, `telefonoVocero`, `emailVocero`, `participantesFem`, `participantesMasc`, `modalidad`, `resolucion` |
| 9 | **AsignacionDocente** | `asignaciones_docente` | Asignación de docente a materia en cronograma | `id`, `cronogramaId`, `docenteId`, `unidadId`, `lugar`, `horaInicio`, `horaFin`, `modalidad`, `uc`, `cantHoras`, `orden`, `viatico`, `hp` |
| 10 | **FechaEncuentro** | `fechas_encuentro` | Fechas de encuentro por asignación | `id`, `asignacionId`, `fecha`, `modalidad` |
| 11 | **Participante** | `participantes` | Estudiantes/participantes del programa | `id`, `nombre`, `apellido`, `cedula`, `telefono`, `email`, `genero`, `unidadId`, `trimestre`, `seccion`, `periodoId`, `regionId`, `aulaTerritorialId` |
| 12 | **HistorialTrimestre** | `historial_trimestre` | Historial de cambios de trimestre de participantes | `id`, `participanteId`, `trimestreAnterior`, `trimestreNuevo`, `periodoId`, `regionId`, `aulaTerritorialId`, `cambiadoPor` |
| 13 | **CronogramaParticipante** | `cronograma_participantes` | Relación N:M entre cronograma y participantes | `id`, `cronogramaId`, `participanteId`, `unidadesIds[]` |
| 14 | **Asistencia** | `asistencias` | Registro de asistencia por participante y encuentro | `id`, `participanteId`, `fechaEncuentroId`, `estado`, `observacion` |
| 15 | **ConfiguracionSistema** | `configuracion_sistema` | Configuración global del sistema | `id`, `coordinadorNacional`, `resolucion`, `registroDocentesAbierto`, `asignacionCargaAbierta`, `inscripcionParticipantesAbierta` |
| 16 | **Bitacora** | `bitacora` | Log de auditoría de acciones del sistema | `id`, `usuarioId`, `modulo`, `accion`, `detalles`, `createdAt` |

### 8.4 Restricciones de Integridad

- **Claves únicas compuestas:** `Periodo (anio, numero)`, `Cronograma (periodoId, aulaTerritorialId, trimestre, seccion)`, `CronogramaParticipante (cronogramaId, participanteId)`, `Asistencia (participanteId, fechaEncuentroId)`.
- **Eliminación en cascada:** Las asignaciones docentes, fechas de encuentro, asistencias, cronograma-participantes e historial se eliminan automáticamente al borrar su registro padre.
- **Campos únicos individuales:** `Usuario.email`, `Docente.cedula`, `Docente.email`, `Region.nombre`, `Seccion.nombre`.

---

## 9. Módulos Funcionales

### 9.1 Dashboard (Página Principal)

- Panel de indicadores con tarjetas de resumen: docentes activos, docentes con carga, periodo actual, cronogramas creados, unidades curriculares, regiones, aulas territoriales activas y participantes.
- Tabla de cronogramas recientes con enlace directo.
- Acciones rápidas: crear cronograma, gestionar docentes, generar reporte PDF, ver expedientes históricos.

### 9.2 Módulo de Docentes

- **CRUD completo** de docentes con validación de campos obligatorios.
- Clasificación por **Categoría** (Contratado / Ordinario) y **Dedicación** (HP, MT, TC, DE).
- Asignación a **Región** y **Aula Territorial de origen**.
- Toggle de **estado activo/inactivo** para docentes que ya no participan.
- **Filtros combinados** por búsqueda textual, estado y aula territorial.
- Visualización del número de **asignaciones activas** por docente.
- Control de acceso: solo administradores editan/eliminan; operadores pueden crear si el registro está abierto.

### 9.3 Módulo de Cronogramas

- **Generador automático** de cronogramas basado en wizard de múltiples pasos:
  1. Selección de Periodo y Ubicación (Región + Aula Territorial).
  2. Configuración de detalles (modalidad, vocero, datos de contacto).
  3. Asignación de materias y número de secciones por materia.
- **Vista agrupada** por Periodo → Trimestre → Aula, con filas expandibles por sección.
- Detección automática de **combinaciones ya registradas** para evitar duplicados.
- Filtrado por trimestre de las unidades curriculares disponibles.
- Estadísticas de docentes y participantes por grupo.

### 9.4 Módulo de Asignación de Carga Docente

- Interfaz de detalle por cronograma para asignar docentes a materias.
- Configuración de horarios (hora inicio/fin), lugar, modalidad y orden.
- Registro de **fechas de encuentro** por asignación.
- Cálculo automático de **viáticos** y **honorarios profesionales (HP)** basados en el tabulador del periodo.

### 9.5 Módulo de Participantes

- Registro de participantes con datos personales, género, período, región y aula.
- Vinculación a cronogramas y unidades curriculares.
- Historial de cambios de trimestre con trazabilidad.

### 9.6 Módulo de Asistencia

- Control de asistencia por cronograma y fecha de encuentro.
- Estados: **Presente**, **Ausente**, **Justificado**.
- Campo de observaciones por registro de asistencia.

### 9.7 Módulo de Estructura de Costos

Compuesto por tres sub-módulos:

1. **Generador de Estructura de Costo (Factibilidad):** Cálculo y exportación en PDF del desglose de costos por cronograma, incluyendo honorarios, viáticos, gastos administrativos y totales.
2. **Costos por Aulas Territoriales:** Configuración de rubros fijos por aula (preinscripción, inscripción, limpieza, vigilancia, gastos administrativos, aportes de coordinación).
3. **Asignación de Viáticos:** Gestión de tarifas de viáticos por aula territorial, con lógica diferenciada por zona geográfica (sede vs. zona).

### 9.8 Módulo de Estadísticas

- **Indicadores KPI** en tarjetas: participantes, cronogramas, docentes, aulas.
- **Gráficos interactivos** con Recharts:
  - Participantes por Trimestre (gráfico de barras).
  - Participantes por Género (gráfico de torta donut).
  - Docentes por Dedicación (gráfico de barras horizontales).
  - Docentes por Categoría (gráfico de torta donut).
- **Filtros dinámicos** por Periodo, Región y Aula Territorial.
- **Exportación a PDF** del reporte de estadísticas con tablas automáticas.

### 9.9 Módulo de Reportes PDF

- Generación de reportes de **cronogramas de planificación** con formato institucional.
- Vista organizada en acordeones: Región → Aula → Trimestre → Secciones.
- Encabezados y pies de página con identidad UNERG.
- Generación del PDF con jsPDF + jspdf-autotable.

### 9.10 Módulo de Expedientes Históricos

- Consulta de información de periodos académicos cerrados.
- Acceso de solo lectura a datos históricos para referencia.

### 9.11 Módulo de Configuración del Sistema (Solo Administrador)

- **Interruptores de procesos:**
  - Registro de Docentes (Abierto/Cerrado).
  - Asignación de Carga (Abierto/Cerrado).
  - Inscripción de Participantes (Abierto/Cerrado).
- **Configuración del Coordinador Nacional.**
- **Gestión de Secciones** (crear/eliminar secciones disponibles).

### 9.12 Módulo de Gestión de Usuarios (Solo Administrador)

- CRUD de usuarios del sistema.
- Asignación de roles (Administrador / Operador).
- Activación/desactivación de cuentas.

### 9.13 Módulo de Bitácora de Seguridad (Solo Administrador)

- Registro cronológico de todas las acciones realizadas en el sistema.
- Campos registrados: usuario, módulo, acción, detalles descriptivos, marca de tiempo.
- Eventos registrados: inicio/cierre de sesión, operaciones CRUD en todos los módulos.

### 9.14 Módulo de Regiones y Aulas Territoriales (Solo Administrador)

- Gestión de Regiones (estados de Venezuela).
- Gestión de Aulas Territoriales por región, con asignación de coordinador, enlace y costos base.

### 9.15 Módulo de Periodos Académicos (Solo Administrador)

- Creación y gestión de periodos con: año, número, modalidad, trimestres habilitados, fechas estimadas, valor del tabulador y resolución.
- Control de estado (Activo/Cerrado): solo un periodo puede estar activo simultáneamente.

### 9.16 Módulo de Unidades Curriculares (Solo Administrador)

- Gestión del pensum de asignaturas con créditos, horas y asignación a trimestre.
- Pensum predeterminado: 18 unidades curriculares distribuidas en Introductorio, I, II, III, IV y V Trimestre.

---

## 10. Seguridad y Control de Acceso

### 10.1 Autenticación

- **Proveedor:** NextAuth.js v5 con estrategia de **credenciales** (email + contraseña).
- **Estrategia de sesión:** JWT (JSON Web Tokens) sin persistencia en base de datos.
- **Hashing de contraseñas:** bcrypt con 12 salt rounds.
- **Protección contra fuerza bruta:** Rate limiting por dirección de email, con bloqueo de 5 minutos después de 5 intentos fallidos.
- **Página de login** personalizada en `/login`.

### 10.2 Roles y Permisos

| Funcionalidad | Administrador | Operador |
|---------------|:---:|:---:|
| Ver Dashboard | ✅ | ✅ |
| Ver Estadísticas | ✅ | ✅ |
| Crear Docentes | ✅ | ✅* |
| Editar/Eliminar Docentes | ✅ | ❌ |
| Crear Cronogramas | ✅ | ✅* |
| Eliminar Cronogramas | ✅ | ❌ |
| Gestionar Participantes | ✅ | ✅ |
| Registrar Asistencia | ✅ | ✅ |
| Generar Reportes PDF | ✅ | ✅ |
| Estructura de Costos | ✅ | ❌ |
| Gestionar Regiones/Aulas | ✅ | ❌ |
| Gestionar Periodos | ✅ | ❌ |
| Gestionar Unidades Curriculares | ✅ | ❌ |
| Gestionar Usuarios | ✅ | ❌ |
| Ver Bitácora | ✅ | ❌ |
| Configuración del Sistema | ✅ | ❌ |

> *Sujeto a que el proceso esté habilitado en la configuración del sistema.*

### 10.3 Auditoría (Bitácora)

Cada acción significativa en el sistema se registra en la tabla `bitacora` con los siguientes datos:
- **Usuario:** Identificador del usuario que realizó la acción.
- **Módulo:** Área del sistema donde ocurrió (SISTEMA, DOCENTES, CRONOGRAMA, etc.).
- **Acción:** Tipo de operación (LOGIN, LOGOUT, CREATE, UPDATE, DELETE).
- **Detalles:** Descripción textual de lo realizado.
- **Fecha/Hora:** Marca de tiempo automática.

### 10.4 Perfil de Usuario

- Los usuarios pueden cambiar su **contraseña** y **correo electrónico** desde un modal de configuración accesible desde la barra lateral.
- El cambio de contraseña requiere la contraseña actual para validación.

---

## 11. Metodología de Desarrollo

### 11.1 Metodología Aplicada

El desarrollo del sistema se realizó siguiendo principios de la **metodología ágil** con enfoque iterativo e incremental, incorporando elementos de:

- **Desarrollo Iterativo:** El sistema se construyó en ciclos incrementales, incorporando módulos de forma progresiva (primero la base de datos y autenticación, luego CRUD de entidades, después cronogramas, y finalmente reportes y estadísticas).
- **Prototipado Evolutivo:** Se partió de prototipos funcionales que fueron refinándose con retroalimentación directa de los usuarios finales (coordinación del programa).
- **Clean Architecture:** Separación clara de responsabilidades entre la capa de presentación (componentes React), la capa de lógica de negocio (API Routes) y la capa de datos (Prisma + PostgreSQL).

### 11.2 Herramientas de Desarrollo

| Herramienta | Uso |
|-------------|-----|
| **Git** | Control de versiones del código fuente |
| **Visual Studio Code** | Editor de código principal |
| **Prisma Studio** | Inspección visual de la base de datos durante desarrollo |
| **PostgreSQL** | Motor de base de datos relacional |
| **Node.js** | Entorno de ejecución del servidor |

### 11.3 Convenciones de Código

- **Lenguaje:** TypeScript con tipado estricto.
- **Nomenclatura de archivos:** `camelCase` para componentes y utilidades, `kebab-case` para rutas.
- **Nomenclatura de base de datos:** `snake_case` para tablas (usando `@@map` en Prisma).
- **Componentes:** Combinación de Server Components (para datos estáticos) y Client Components (`'use client'`) para interactividad.
- **Internacionalización:** Interfaz completamente en español, acorde al contexto institucional.

---

## 12. Requisitos del Sistema

### 12.1 Requisitos de Hardware (Servidor)

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| Procesador | 2 núcleos | 4 núcleos |
| RAM | 2 GB | 4 GB |
| Almacenamiento | 10 GB | 20 GB SSD |
| Red | Conexión estable | Ethernet dedicada |

### 12.2 Requisitos de Software (Servidor)

| Software | Versión Mínima |
|----------|---------------|
| Node.js | 18.x o superior |
| PostgreSQL | 13.x o superior |
| npm | 9.x o superior |
| Sistema Operativo | Windows 10+, Ubuntu 20.04+ o macOS 12+ |

### 12.3 Requisitos del Cliente (Navegador)

| Navegador | Versión Mínima |
|-----------|---------------|
| Google Chrome | 90+ |
| Mozilla Firefox | 88+ |
| Microsoft Edge | 90+ |
| Safari | 14+ |

---

## 13. Conclusiones

El **Sistema de Planificación Académica de Salud Pública** representa un avance significativo en la modernización de los procesos administrativos del Decanato de Postgrado de la UNERG. Al sustituir los procedimientos manuales basados en hojas de cálculo de Excel por una plataforma web centralizada, segura y automatizada, se logran los siguientes resultados:

1. **Eliminación de la dispersión de información:** Toda la data académica se almacena de forma centralizada en PostgreSQL, accesible desde cualquier punto con conexión a Internet.

2. **Reducción drástica de errores:** Los cálculos automáticos de costos, viáticos y honorarios eliminan los errores aritméticos del proceso manual.

3. **Trazabilidad completa:** La bitácora de seguridad garantiza la rendición de cuentas, registrando cada acción con usuario, fecha y detalles.

4. **Toma de decisiones informada:** El módulo de estadísticas con gráficos interactivos permite a la coordinación visualizar indicadores clave en tiempo real.

5. **Ahorro de tiempo significativo:** La automatización de cronogramas, reportes y cálculos libera al personal de tareas repetitivas, permitiéndole enfocarse en labores de mayor valor.

6. **Seguridad de la información:** El control de acceso por roles, el hashing de contraseñas y la protección contra fuerza bruta protegen los datos institucionales.

7. **Escalabilidad futura:** La arquitectura Next.js + PostgreSQL + Prisma permite incorporar nuevos módulos y funcionalidades sin reestructurar el sistema existente.

---

> **Elaborado por:** Equipo de Desarrollo del Sistema de Planificación Académica  
> **Institución:** Universidad Nacional Experimental Rómulo Gallegos (UNERG) — Decanato de Postgrado  
> **Programa:** Especialización en Gerencia de Salud Pública  
> **Fecha:** Agosto 2026
