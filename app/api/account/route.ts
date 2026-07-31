import { AccountService } from "@/lib/services/AccountService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function DELETE(request: Request) {
  try {
    const limited = rateLimit({
      key: `account:delete:${clientIp(request)}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as {
      confirmation?: string;
    };

    const result = await AccountService.deleteMyAccount(
      body.confirmation ?? "",
    );
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Failed to delete account");
  }
}
