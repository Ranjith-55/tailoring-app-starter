"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Shop name for WhatsApp message signatures, from Settings → Shop Profile.
// Defaults to "Sree Designer" until that's loaded (or if it's never been set).
export function useShopName() {
  const [shopName, setShopName] = useState("Sree Designer");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("shop_profile").select("shop_name").eq("id", true).maybeSingle();
      if (data?.shop_name) setShopName(data.shop_name);
    }
    load();
  }, []);

  return shopName;
}
