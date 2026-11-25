// Shared helpers for turning a garment template's free-text inputs (name +
// comma-separated field list) into the shape garment_templates expects.
// Used by AddGarmentTypeForm (the owner-only "add garment type" popup).
export function slugifyGarmentType(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseGarmentFields(text) {
  return text
    .split(",")
    .map((f) => f.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}
