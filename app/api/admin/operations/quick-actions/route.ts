import { PermissionService } from "@/lib/auth/PermissionService";
import { SessionService } from "@/lib/auth/SessionService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { OperationsQuickActionsService } from "@/lib/services/OperationsQuickActionsService";

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();

    const limited = rateLimit({
      key: `admin:ops-quick-actions:${clientIp(request)}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json()) as {
      action?: "run_all_imports" | "run_sheriff_import";
    };

    const user = await SessionService.currentUser();

    if (body.action === "run_all_imports") {
      const result = await OperationsQuickActionsService.runAllImports(
        user?.email ?? null,
      );
      return jsonOk(result);
    }

    if (body.action === "run_sheriff_import") {
      const result = await OperationsQuickActionsService.runSheriffImport();
      return jsonOk(result);
    }

    return jsonOk(
      { error: "Unknown action" },
      { status: 400 },
    );
  } catch (error) {
    return jsonError(error, "Quick action failed.");
  }
}
