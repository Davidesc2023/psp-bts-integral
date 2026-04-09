# 🚀 Runbook: Ejecución del Framework AI-DLC con Claude + Cursor

---

## 📋 Índice

1. [Descarga e inicialización del repositorio](#paso-1)
2. [Inicio del framework](#paso-2)
3. [Fases de la metodología AI-DLC](#fases)
4. [Cocreación con AI-DLC | Inception](#paso-3)

---

## Paso 1: Descarga del framework AI-DLC e inicialización del repositorio

> 🔗 **Repositorio oficial:** [aidlc-workflow](https://github.com/awslabs/aidlc-workflows?tab=readme-ov-file#usage)
> 📦 **Versión:** [Descargar v0.1.5](https://github.com/awslabs/aidlc-workflows/releases/tag/v0.1.5)

Partimos de un espacio con el PRD y la carpeta con el framework e inicialización del repositorio.

```sh
cd /Users/cbraatz/workspace/SDD/ai-dlc
```

```sh
mkdir agentic_interviewer_ai
```

```sh
cd agentic_interviewer_ai
cp ../PRD_agentic_interviewer_ai.md PRD_agentic_interviewer_ai.md
cp ../aidlc-rules/aws-aidlc-rules/core-workflow.md ./CLAUDE.md
mkdir -p .aidlc-rule-details
cp -R ../aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

```sh
cursor .
```

---

## Paso 2: Inicio del framework

> **💬 PROMPT / CONTEXTO**
>
> **Usando AI-DLC**, construiremos un producto que consiste en una plataforma de entrevistas agénticas que conduce screenings conversacionales inteligentes vía Telegram para empresas de alto volumen en América Latina, reemplazando chatbots de reglas estáticas con un agente que razona, repregunta y entrega evidencia estructurada al reclutador humano; con base en el Product Requirements Document (PRD) `@PRD_agentic_interviewer_ai.md`.

---

## Fases de la metodología AI-DLC

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#ffffff',
  'primaryTextColor': '#1a1a2e',
  'primaryBorderColor': '#cccccc',
  'lineColor': '#aaaaaa',
  'fontFamily': 'inter, sans-serif'
}}}%%
graph TD
    MA(🧠 Master Agent)
    IN(🔍 Inception)
    CO(🏗️ Construction)
    OP(⚙️ Operations)

    MA_DESC[Agente principal que orquesta y coordina el sistema]
    IN_DESC[Fase donde se define el problema, alcance y objetivos]
    CO_DESC[Fase de desarrollo donde se construye la solución]
    OP_DESC[Fase de operación, monitoreo y mantenimiento]

    MA --> MA_DESC
    IN --> IN_DESC
    CO --> CO_DESC
    OP --> OP_DESC

    style MA fill:#f0e6ff,stroke:#7c3aed,stroke-width:2px,color:#4c1d95
    style IN fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,color:#1e1b4b
    style CO fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0c4a6e
    style OP fill:#fff7ed,stroke:#ea580c,stroke-width:2px,color:#7c2d12
    style MA_DESC fill:#f9f5ff,stroke:#7c3aed,stroke-width:1px,color:#4c1d95
    style IN_DESC fill:#eef2ff,stroke:#4338ca,stroke-width:1px,color:#1e1b4b
    style CO_DESC fill:#f0f9ff,stroke:#0284c7,stroke-width:1px,color:#0c4a6e
    style OP_DESC fill:#fff7ed,stroke:#ea580c,stroke-width:1px,color:#7c2d12
```

---

## Intenciones: pasos

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#ffffff',
  'primaryTextColor': '#1a1a2e',
  'lineColor': '#64748b',
  'fontFamily': 'inter, sans-serif'
}}}%%
graph LR
    P1["1️⃣ Describe tu objetivo
Explica lo que quieres lograr en lenguaje sencillo"]
    P2["2️⃣ Responde las preguntas
La IA hace preguntas para minimizar la ambigüedad"]
    P3["3️⃣ Valida los artefactos
En cada actividad se generan artefactos con especificaciones"]
    P4["4️⃣ Aprueba y continúa
Confirmando decisiones en momentos críticos"]

    P1 --> P2 --> P3 --> P4

    style P1 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
    style P2 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
    style P3 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
    style P4 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
```

---

## Paso 3: Cocreación con AI-DLC Framework | Inception

> 🎯 **Objetivo:** Definir la "Única Fuente de Verdad" antes de codificar.
>
> Captura intenciones, elabora requisitos y desglosa el trabajo en unidades manejables.

### 📁 Tipo de artefactos

A continuación se describen las actividades y artefactos generados durante la fase inicial del ciclo de vida de desarrollo impulsado por IA (AI-DLC).

| Actividad | Tipo de Artefacto | Descripción (AI-DLC) |
| :--- | :--- | :--- |
| **Workspace Detection** | `workspace-detection.md` | Análisis del entorno técnico para dar contexto base a la IA sobre dependencias. |
| **Requirements Analysis** | `requirements-analysis.md` | Refinamiento de necesidades mediante prompts, eliminando ambigüedades técnicas. |
| **User Stories** | `user-stories.md` | Criterios estructurados, optimizados para instrucciones de generación de código. |
| **Workflow Planning** | `workflow-planning.md` | Orquestación de tareas y validación humana (Human-in-the-loop). |
| **Application Design** | `application-design.md` | Blueprint de arquitectura para asegurar coherencia en la generación masiva. |
| **Units Generation** | `units-generation.md` | Creación de componentes atómicos con prompts y pruebas unitarias. |

---

A continuación se detallan las actividades, el proceso de desarrollo de cada una y un ejemplo como muestra de los artefactos generados durante la cocreación a partir del framework para el producto guía de curso **EntreVista AI** (plataforma de entrevistas agénticas que conduce screenings conversacionales inteligentes).

---

### 🔎 PHASE 00 — Workspace Detection

**Project Information**

| Campo | Valor |
| :--- | :--- |
| **Project Name** | `Agentic Interviewer AI` |
| **Project Type** | Greenfield |
| **Start Date** | `2026-03-09` |
| **Current Stage** | `INCEPTION` → `Requirements Analysis` |

**Workspace State**

- **Existing Code:** No
- **Reverse Engineering:** No
- **Root:** `.../ai-dlc/agentic_interviewer_ai_v2`

> **📌 Code Location Rules**
>
> - **Application Code:** Workspace root
> - **Documentation:** Solo en `aidlc-docs/`
> - **Structure Patterns:** Ver `code-generation.md` Critical Rules

---

### 📝 PHASE 01 — Requirements Analysis

**Usuarios del Sistema**

| Actor | Descripción | Acceso |
| :--- | :--- | :--- |
| **Candidato** | Persona que será entrevistada. No necesita cuenta. Accede vía link único. | Link único por entrevista |
| **Reclutador** | Persona en la startup que configura entrevistas, envía links y revisa resultados. | Cuenta con credenciales en plataforma |

> ⚠️ **Nota:** Administrador y Hiring Manager están *fuera del alcance (Out of Scope)* para este MVP.

**Functional Requirements**
> **Propósito:** Qué hace el sistema.

- [x] Core Agental Reasoning
- [x] Telegram API Integration

**Non-Functional Requirements**
> **Propósito:** Cómo se comporta el sistema.

- [x] Response Latency < 2s
- [ ] 99.5% Availability

**Success Criteria (MVP)**

- [x] Conversación fluida completada
- [x] Notificación al Reclutador

---

### 🧑‍💼 PHASE 02 — User Stories

#### Personas

**Valentina** — User Persona
> Representación semi-ficticia enfocada en necesidades psicológicas y laborales. Las historias de usuario se derivan de sus "pain points" específicos.

#### Backlog de historias y Escenarios con criterios de aceptación en lenguaje Gherkin

- **Feature-Based Grouping:** Historias organizadas por capacidades del agente.
- **Validation:** Escenarios `Given / When / Then` listos para ser transformados en Unit Tests.

---

### 🗺️ PHASE 03 — Workflow Planning

> **Strategy:** Definición táctica del plan de ejecución para alimentar el *Application Design*. Se establece el mecanismo para la definición de componentes, servicios y la estrategia de construcción de estos.

---

### 🏛️ PHASE 04 — Application Design

| Capa | Responsabilidad | Archivo |
| :--- | :--- | :--- |
| **Componentes** | Definición de estilo arquitectónico y capas. | `components.md` |
| **Servicios** | Definiciones preliminares relacionadas con lógica de negocio y métodos core. | `services.md` |
| **Dependencias** | Dependencias entre componentes y patrón de resolución. | `component-dependency.md` |

---

### 🧩 PHASE 05 — Units Generation

**¿Qué es una Unidad?**

Una **Unidad** es un elemento de trabajo cohesivo y autónomo derivado de una Intención. Las unidades están acopladas libremente y se pueden desarrollar de forma independiente.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#ffffff',
  'primaryTextColor': '#1a1a2e',
  'lineColor': '#94a3b8',
  'fontFamily': 'inter, sans-serif'
}}}%%
graph LR
    A["🎯 Cohesivo
Los elementos dentro de una unidad sirven para un solo propósito"]
    B["📦 Autónomo
Se puede desarrollar y probar de forma independiente"]
    C["🔗 Acoplado libremente
Dependencias mínimas de otras unidades"]
    D["🪟 Bien atado
Interfaces claras con el resto del sistema"]

    A ~~~ B ~~~ C ~~~ D

    style A fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d
    style B fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    style C fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#78350f
    style D fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
```

> **Generación por Dominio de Negocio**
>
> Abarca diferentes historias de usuario agrupadas para garantizar consistencia lógica y funcional en cada iteración de la IA.

---

