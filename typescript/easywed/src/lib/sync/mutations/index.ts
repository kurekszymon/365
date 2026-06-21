// Barrel for the per-entity Supabase mutation modules. The shared plumbing in
// `./shared` (run/log/getWeddingId, row mappers) stays internal and is
// intentionally not re-exported here, preserving the module's public surface.
export * from "./wedding"
export * from "./hall"
export * from "./tables"
export * from "./guests"
export * from "./fixtures"
export * from "./reminders"
export * from "./layout"
