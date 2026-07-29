import { createClient } from "@/lib/supabase/server";

export async function loadCalibrationHistory() {

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("valuation_calibration")
        .select("*");

    if (error) {

        throw error;

    }

    return data;

}
