import RealtimeQueue from "./components/RealtimeQueue";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default async function QueuePage() {

  return (

    <div className="space-y-8">

      <h1 className="text-4xl font-bold">

        Queue Monitor

      </h1>

      <RealtimeQueue />

    </div>

  );

}
