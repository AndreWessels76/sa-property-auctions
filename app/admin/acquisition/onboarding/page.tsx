import Link from "next/link";
import { PermissionService, SessionService } from "@/lib/auth";
import { ONBOARDING_STEPS } from "@/lib/acquisition/licensing";
import { defaultBiddersChoiceMapping } from "@/lib/acquisition/fieldMapping";
import { bootstrapConnectorPlugins } from "@/lib/acquisition/connectorPluginRegistry";

export const dynamic = "force-dynamic";

export default async function PartnerOnboardingPage() {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();
  const connectors = bootstrapConnectorPlugins();
  const mapping = defaultBiddersChoiceMapping();

  return (
    <div>
      <Link
        href="/admin/acquisition"
        className="text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        ← Acquisition Centre
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-navy-900">
        Partner Onboarding Wizard
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Rapid onboarding for licensed partners. Listings stay pending until
        verification — never auto-published.
      </p>

      <ol className="mt-8 space-y-3">
        {ONBOARDING_STEPS.map((step, index) => (
          <li
            key={step}
            className="flex gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold capitalize text-navy-900">
                {step.replace(/_/g, " ")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {step === "company" &&
                  "Capture company, contacts and supported regions."}
                {step === "agreement" &&
                  "Record data agreement and licence permissions."}
                {step === "connector" &&
                  "Select or register a connector plugin."}
                {step === "field_mapping" &&
                  "Map partner fields to platform schema."}
                {step === "sample_validation" &&
                  "Validate a sample payload — reject incomplete rows."}
                {step === "identity_test" &&
                  "Run Property Master fingerprint matching."}
                {step === "import_test" &&
                  "Dry-run import orchestration with audit trail."}
                {step === "verification_test" &&
                  "Confirm checklist gate before approval."}
                {step === "approval" &&
                  "Admin approval required for production enable."}
                {step === "production_enable" &&
                  "Enable scheduled/webhook imports under licence."}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-2xl border bg-white p-5">
        <h2 className="font-bold text-navy-900">Available connectors</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {connectors.map((c) => (
            <li key={c.definition.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {c.definition.name}{" "}
              <span className="text-xs text-slate-500">
                ({c.definition.health})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="font-bold text-navy-900">
          Default field mapping (v{mapping.version})
        </h2>
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {mapping.mappings.map((m) => (
            <li key={`${m.sourceField}-${m.targetField}`}>
              {m.sourceField} → {m.targetField}
              {m.required ? " (required)" : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
