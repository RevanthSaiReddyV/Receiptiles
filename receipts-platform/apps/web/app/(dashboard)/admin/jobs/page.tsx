import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { LocalDate } from "@/app/components/local-date";

export const dynamic = 'force-dynamic';

export default async function AdminJobsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const jobs = await db.ingestionJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Processing Jobs</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Monitor the status of your receipt processing jobs.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <svg
              className="h-10 w-10 text-zinc-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
            <p className="mt-3 text-sm text-zinc-400">No processing jobs yet</p>
            <p className="mt-1 text-xs text-zinc-400">
              Jobs will appear here when you upload or sync receipts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {jobs.map((job: typeof jobs[number]) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium font-mono text-sm text-zinc-900 truncate">
                    {job.id}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {job.fileName ?? "Unknown file"} &middot;{" "}
                    {job.source.toLowerCase()} &middot;{" "}
                    <LocalDate date={job.createdAt} format="datetime" />
                  </p>
                  {job.error && (
                    <p className="mt-1 text-sm text-red-600">{job.error}</p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  <StatusBadge status={job.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20",
    PROCESSING: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    FAILED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-zinc-100 text-zinc-600"}`}
    >
      {status}
    </span>
  );
}
