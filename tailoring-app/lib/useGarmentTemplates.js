"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Garment types + their measurement fields, owner-editable via /templates
// (see supabase/schema.sql: garment_templates). Replaces the hard-coded
// GARMENT_FIELDS object that used to live in MeasurementForm.js.
export function useGarmentTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    // `select("*")` rather than naming `is_active` explicitly: on a database
    // that hasn't run the migration adding that column yet, naming it here
    // would 400 the whole request. Filtering client-side means a missing
    // column just reads as `undefined` (kept), not a failed query.
    const { data } = await supabase.from("garment_templates").select("*").order("label");
    setTemplates((data || []).filter((t) => t.is_active !== false));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return { templates, loading, refresh: load };
}
