import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SavedComparisonsPanel from "@/components/workspace/SavedComparisonsPanel";
import LocalFavouritesPanel from "@/components/workspace/LocalFavouritesPanel";
import { SessionService } from "@/lib/auth/SessionService";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import { WatchlistRepository } from "@/lib/repositories/WatchlistRepository";
import { AlertRepository } from "@/lib/repositories/AlertRepository";
import { InvestorWorkspaceService } from "@/lib/services/InvestorWorkspaceService";
import { PropertyService } from "@/lib/services/PropertyService";
import { buildInvestorDashboard } from "@/lib/intelligence/workspaceDashboard";
import { formatAuctionDate } from "@/lib/format";
import UpgradePrompt from "@/app/components/auth/UpgradePrompt";

export const dynamic = "force-dynamic";

function PropertyLink({
  id,
  title,
  auctionDate,
}: {
  id: string;
  title: string;
  auctionDate?: string | null;
}) {
  return (
    <li>
      <Link href={`/properties/${id}`} className="font-medium text-navy-900 underline">
        {title}
      </Link>
      {auctionDate ? (
        <span className="ml-2 text-xs text-slate-500">
          {formatAuctionDate(auctionDate)}
        </span>
      ) : (
        <span className="ml-2 text-xs italic text-slate-400">Auction date not supplied</span>
      )}
    </li>
  );
}

export default async function InvestorWorkspacePage() {
  const user = await SessionService.currentUser();
  if (!user) {
    redirect("/login?next=/workspace");
  }

  const premium = await SubscriptionService.premium();

  let dashboard = buildInvestorDashboard({
    properties: [],
    notes: [],
    trackers: [],
    alerts: [],
  });

  if (premium) {
    const watchlist = await WatchlistRepository.list(user.id).catch(() => []);
    const properties = await PropertyService.getForWorkspace(
      watchlist.map((w) => w.property_id),
    ).catch(() => []);
    const [notes, trackers, alerts] = await Promise.all([
      InvestorWorkspaceService.listNotes(user.id).catch(() => []),
      InvestorWorkspaceService.listTrackers(user.id).catch(() => []),
      AlertRepository.listRecent(user.id, 12).catch(() => []),
    ]);
    dashboard = buildInvestorDashboard({
      properties,
      notes: notes as never,
      trackers: trackers as never,
      alerts,
    });
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Premium
        </p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900">
          Investor Workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Private watchlist, notes, trackers and alerts. Decision support only —
          not investment advice. Historical / expired listings you saved remain
          here even when hidden from the public catalogue.
        </p>

        {!premium ? (
          <div className="mt-8">
            <UpgradePrompt />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">My Watchlist</h2>
              {dashboard.watchlist.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No saved properties. Use Favourites / watchlist on a listing.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {dashboard.watchlist.slice(0, 20).map((p) => (
                    <PropertyLink
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      auctionDate={p.auction_date}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">Upcoming auctions</h2>
              {dashboard.upcoming.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No upcoming/live listings on your watchlist.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {dashboard.upcoming.map((p) => (
                    <PropertyLink
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      auctionDate={p.auction_date}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">Auctions this week</h2>
              {dashboard.thisWeek.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  None of your saved listings auction in the next 7 days.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {dashboard.thisWeek.map((p) => (
                    <PropertyLink
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      auctionDate={p.auction_date}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">
                Due diligence attention
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Missing tracker fields only — not a legal risk score.
              </p>
              {dashboard.attention.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  No outstanding tracker fields on upcoming watchlist items.
                </p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm">
                  {dashboard.attention.map((item) => (
                    <li key={item.propertyId}>
                      <Link
                        href={`/properties/${item.propertyId}`}
                        className="font-medium text-navy-900 underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {item.reasons.join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">Alerts</h2>
              {dashboard.alerts.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">No alert history yet.</p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {dashboard.alerts.map((alert) => (
                    <li key={alert.id}>
                      <span className="font-medium">{alert.title}</span>
                      {alert.message ? (
                        <p className="text-xs text-slate-500">{alert.message}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/alerts" className="mt-4 inline-block text-xs font-semibold underline">
                Manage smart alerts
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">Private notes</h2>
              {dashboard.notes.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  Add notes from a property detail page.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {dashboard.notes.map((note, i) => (
                    <li key={note.id ?? i}>
                      {note.title || "Note"}
                      {note.property_id ? (
                        <Link
                          href={`/properties/${note.property_id}`}
                          className="ml-2 text-xs underline"
                        >
                          Open listing
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <LocalFavouritesPanel />

            <SavedComparisonsPanel />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-navy-900">Research &amp; calendar</h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="/calendar" className="font-semibold underline">
                    Auction calendar
                  </Link>
                </li>
                <li>
                  <Link href="/compare" className="font-semibold underline">
                    Property comparison
                  </Link>
                </li>
                <li>
                  Open a listing for its research report, source provenance, and
                  tracker.
                </li>
                {dashboard.historicalRetained.length > 0 ? (
                  <li className="text-xs text-slate-500">
                    {dashboard.historicalRetained.length} saved listing
                    {dashboard.historicalRetained.length === 1 ? "" : "s"} are
                    historical (hidden from the public catalogue, retained here).
                  </li>
                ) : null}
              </ul>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
