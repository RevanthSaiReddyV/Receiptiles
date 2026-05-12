import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

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
      <h1 className="text-2xl font-bold">Processing Jobs</h1>
      <p className="mt-1 text-gray-600">
        Monitor the status of your receipt processing jobs.
      </p>

      <div className="mt-6 space-y-2">
        {jobs.length === 0 ? (
          <p className="text-gray-500">No jobs yet.</p>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium font-mono text-sm">{job.id}</p>
                <p className="text-sm text-gray-500">
                  {job.fileName ?? "Unknown file"} &middot;{" "}
                  {job.source.toLowerCase()} &middot;{" "}
                  {new Date(job.createdAt).toLocaleString()}
                </p>
                {job.error && (
                  <p className="mt-1 text-sm text-red-600">{job.error}</p>
                )}
              </div>
              <StatusBadge status={job.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}
