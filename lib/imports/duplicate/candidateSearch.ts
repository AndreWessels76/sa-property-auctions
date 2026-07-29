import { supabase } from "@/lib/supabase";

export async function candidateSearch(

  province: string,

  town: string

) {

  const { data } = await supabase

    .from("properties")

    .select("*")

    .eq("province", province)

    .eq("town", town)

    .limit(100);

  return data ?? [];

}