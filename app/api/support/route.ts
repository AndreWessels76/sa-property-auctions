import { AccountService } from "@/lib/services/AccountService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function POST(request: Request) {
  try {
    const limited = rateLimit({
      key: `support:${clientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      type?: "contact" | "privacy";
      category?: string;
    };

    const result = await AccountService.submitSupportRequest({
      name: body.name ?? "",
      email: body.email ?? "",
      subject: body.subject ?? "",
      message: body.message ?? "",
      type: body.type === "privacy" ? "privacy" : "contact",
      category: body.category,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Failed to submit request");
  }
}
