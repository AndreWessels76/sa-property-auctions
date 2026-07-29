"use client";

interface Props {

  queue: any[];

}

export default function QueueTable({

  queue,

}: Props) {

  return (

    <div className="overflow-hidden rounded-2xl bg-white shadow">

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr>

            <th className="p-4 text-left">
              Source
            </th>

            <th>Status</th>

            <th>Priority</th>

            <th>Progress</th>

          </tr>

        </thead>

        <tbody>

          {queue.map((item) => (

            <tr
              key={item.id}
              className="border-t"
            >

              <td className="p-4">

                {item.import_sources?.name}

              </td>

              <td>

                {item.queue_status}

              </td>

              <td>

                {item.priority}

              </td>

              <td>

                {item.import_jobs?.progress ?? 0}%

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}