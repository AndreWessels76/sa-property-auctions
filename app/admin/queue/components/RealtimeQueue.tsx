"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import QueueCard from "./QueueCard";
import QueueTable from "./QueueTable";

export default function RealtimeQueue() {

  const supabase = createSupabaseClient();

  const [queue, setQueue] = useState<any[]>([]);

  async function loadQueue() {

    const { data, error } = await supabase
      .from("import_queue")
      .select(`
        *,
        import_sources(name),
        import_jobs(status,progress)
      `)
      .order("created_at", {
        ascending: false,
      });

    if (!error) {
      setQueue(data ?? []);
    }
  }

  useEffect(() => {

    loadQueue();

    const channel = supabase
      .channel("queue-monitor")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "import_queue",
        },
        () => {

          loadQueue();

        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "import_jobs",
        },
        () => {

          loadQueue();

        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "import_job_logs",
        },
        () => {

          loadQueue();

        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "import_sources",
        },
        () => {

          loadQueue();

        }
      )

      .subscribe();

    return () => {

      supabase.removeChannel(channel);

    };

  }, []);

  const waiting =
    queue.filter(
      x => x.queue_status === "Waiting"
    ).length;

  const running =
    queue.filter(
      x => x.queue_status === "Running"
    ).length;

  const completed =
    queue.filter(
      x => x.queue_status === "Completed"
    ).length;

  const failed =
    queue.filter(
      x => x.queue_status === "Failed"
    ).length;

  return (
    <>
      <div className="grid gap-6 md:grid-cols-4">

        <QueueCard
          title="Waiting"
          value={waiting}
          color="border-yellow-500"
        />

        <QueueCard
          title="Running"
          value={running}
          color="border-green-500"
        />

        <QueueCard
          title="Completed"
          value={completed}
          color="border-blue-500"
        />

        <QueueCard
          title="Failed"
          value={failed}
          color="border-red-500"
        />

      </div>

      <QueueTable queue={queue} />
    </>
  );

}
