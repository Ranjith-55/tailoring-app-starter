// Shared formatting for a measurement's `values` jsonb blob, used anywhere
// a measurement snapshot is summarized as text (customer detail, order
// detail, measurement history). Each real field can have its own unit,
// stored as a companion `${field}_unit` key — this filters those metadata
// keys out of the field list and appends each field's own unit inline
// instead of one unit for the whole record.
export function formatMeasurementSummary(values) {
  if (!values) return "—";
  if (values.notes) return values.notes;

  const realFields = Object.keys(values).filter((k) => !k.endsWith("_unit") && k !== "_unit");
  if (realFields.length === 0) return "—";

  const parts = realFields.map((k) => {
    const unit = values[`${k}_unit`] || values._unit || "in";
    return `${k.replace(/_/g, " ")}: ${values[k]}${unit}`;
  });
  return parts.join(", ");
}
