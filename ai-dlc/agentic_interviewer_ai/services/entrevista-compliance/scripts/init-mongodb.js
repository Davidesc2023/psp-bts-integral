/**
 * MongoDB Init Script — entrevista-compliance
 * Crea las 8 colecciones con índices para US-23/US-24/US-25/US-33.
 *
 * Uso: mongosh "mongodb+srv://..." --file scripts/init-mongodb.js
 */

const DB_NAME = "entrevista_compliance";
const db = db.getSiblingDB(DB_NAME);

print("=== Iniciando setup de MongoDB para entrevista-compliance ===");

// ─────────────────────────────────────────────
// 1. consent_records
// ─────────────────────────────────────────────
db.createCollection("consent_records", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["session_id", "candidate_id", "consented", "idempotency_key", "timestamp"],
      properties: {
        session_id:      { bsonType: "string" },
        candidate_id:    { bsonType: "string" },
        consented:       { bsonType: "bool"   },
        idempotency_key: { bsonType: "string" },
        timestamp:       { bsonType: "date"   },
      },
    },
  },
});
// PAT-01: índice único por idempotency_key (garantiza at-most-once)
db.consent_records.createIndex(
  { idempotency_key: 1 },
  { unique: true, name: "uq_idempotency_key" }
);
// Consulta por sesión
db.consent_records.createIndex(
  { session_id: 1 },
  { name: "idx_session_id" }
);
print("✓ consent_records — índices creados");

// ─────────────────────────────────────────────
// 2. audit_events
// ─────────────────────────────────────────────
db.createCollection("audit_events");
// PAT-04: índice único compuesto (session_id, seq_num) — uno por slot secuencial
db.audit_events.createIndex(
  { session_id: 1, seq_num: 1 },
  { unique: true, name: "uq_session_seq" }
);
// Consulta por sesión ordenado por secuencia
db.audit_events.createIndex(
  { session_id: 1, timestamp: 1 },
  { name: "idx_session_timestamp" }
);
// PAT-08: purge por timestamp
db.audit_events.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp_purge" }
);
print("✓ audit_events — índices creados");

// ─────────────────────────────────────────────
// 3. audit_transcripts
// ─────────────────────────────────────────────
db.createCollection("audit_transcripts");
db.audit_transcripts.createIndex(
  { session_id: 1, turn_index: 1 },
  { unique: true, name: "uq_session_turn" }
);
db.audit_transcripts.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp_purge" }
);
print("✓ audit_transcripts — índices creados");

// ─────────────────────────────────────────────
// 4. nps_responses
// ─────────────────────────────────────────────
db.createCollection("nps_responses");
// BR-C05: un NPS por sesión → índice único por session_id
db.nps_responses.createIndex(
  { session_id: 1 },
  { unique: true, name: "uq_session_nps" }
);
db.nps_responses.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp_purge" }
);
print("✓ nps_responses — índices creados");

// ─────────────────────────────────────────────
// 5. escalations
// ─────────────────────────────────────────────
db.createCollection("escalations");
db.escalations.createIndex(
  { session_id: 1 },
  { name: "idx_session_escalations" }
);
db.escalations.createIndex(
  { severity: 1, resolved: 1 },
  { name: "idx_severity_resolved" }
);
db.escalations.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp_purge" }
);
print("✓ escalations — índices creados");

// ─────────────────────────────────────────────
// 6. campaigns_retention
// ─────────────────────────────────────────────
db.createCollection("campaigns_retention");
// US-33: un policy por colección
db.campaigns_retention.createIndex(
  { collection_name: 1 },
  { unique: true, name: "uq_collection_name" }
);
print("✓ campaigns_retention — índices creados");

// ─────────────────────────────────────────────
// 7. session_counters
// ─────────────────────────────────────────────
db.createCollection("session_counters");
// PAT-04: acceso O(1) por session_id
db.session_counters.createIndex(
  { session_id: 1 },
  { unique: true, name: "uq_session_counter" }
);
db.session_counters.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp_purge", sparse: true }
);
print("✓ session_counters — índices creados");

// ─────────────────────────────────────────────
// 8. audit_meta_events
// ─────────────────────────────────────────────
db.createCollection("audit_meta_events");
db.audit_meta_events.createIndex(
  { session_id: 1, timestamp: 1 },
  { name: "idx_session_meta_timestamp" }
);
db.audit_meta_events.createIndex(
  { timestamp: 1 },
  { name: "idx_timestamp_purge" }
);
print("✓ audit_meta_events — índices creados");

// ─────────────────────────────────────────────
// Seed: políticas de retención por defecto
// ─────────────────────────────────────────────
const now = new Date();
const defaultPolicies = [
  { collection_name: "audit_events",      retention_days: 365,  last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
  { collection_name: "audit_transcripts", retention_days: 180,  last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
  { collection_name: "nps_responses",     retention_days: 365,  last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
  { collection_name: "escalations",       retention_days: 730,  last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
  { collection_name: "session_counters",  retention_days: 90,   last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
  { collection_name: "audit_meta_events", retention_days: 365,  last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
  { collection_name: "consent_records",   retention_days: 2555, last_purge_at: null, last_purge_deleted_count: 0, created_at: now, updated_at: now },
];

defaultPolicies.forEach((policy) => {
  db.campaigns_retention.updateOne(
    { collection_name: policy.collection_name },
    { $setOnInsert: policy },
    { upsert: true }
  );
});
print("✓ campaigns_retention — políticas por defecto insertadas");

print("\n=== Setup completo para entrevista-compliance ===");
print(`Base de datos: ${DB_NAME}`);
print("Colecciones: 8 | Índices únicos: 6 | Políticas de retención: 7");
