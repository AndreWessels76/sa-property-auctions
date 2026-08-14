import HistoricalResolutionReviewClient from "../../components/HistoricalResolutionReviewClient";

export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <HistoricalResolutionReviewClient eventId={eventId} />;
}
