import { AccountService } from "@/lib/services/AccountService";
import { jsonError } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function GET(request: Request) {
  try {
    const limited = rateLimit({
      key: `account:export:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const payload = await AccountService.exportMyData();

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="sa-property-auctions-data-export.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error, "Failed to export account data");
  }
}
