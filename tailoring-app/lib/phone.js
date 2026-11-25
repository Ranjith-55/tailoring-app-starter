"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

// Strips everything but digits, then keeps just the trailing 10 — drops a
// leading 0 (trunk prefix) or 91/+91 (country code) however it was typed.
export function normalizePhoneDigits(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidIndianMobile(raw) {
  return INDIAN_MOBILE_RE.test(normalizePhoneDigits(raw));
}

// Canonical stored form: +91 followed by the 10-digit number. Every phone
// field in the app should save through this so lookups/duplicate checks
// are comparing the same shape regardless of how it was typed.
export function formatIndianMobile(raw) {
  const core = normalizePhoneDigits(raw);
  return core ? `+91${core}` : "";
}

// Debounced "does a customer with this phone already exist" check, as the
// user types. `excludeId` skips a customer's own row (editing shouldn't
// flag itself as a duplicate of itself).
export function usePhoneDuplicate(rawPhone, excludeId) {
  const [duplicate, setDuplicate] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isValidIndianMobile(rawPhone)) {
      setDuplicate(null);
      setChecking(false);
      return;
    }
    const formatted = formatIndianMobile(rawPhone);
    setChecking(true);
    let cancelled = false;
    const timeout = setTimeout(async () => {
      let query = supabase
        .from("customers")
        .select("id, full_name, customer_code")
        .eq("phone", formatted);
      if (excludeId) query = query.neq("id", excludeId);
      const { data } = await query.maybeSingle();
      if (!cancelled) {
        setDuplicate(data || null);
        setChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [rawPhone, excludeId]);

  return { duplicate, checking };
}
