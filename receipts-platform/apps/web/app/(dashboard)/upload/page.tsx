import { uploadReceipt } from "@/lib/actions/upload";

export default function UploadPage() {
  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Upload Receipt</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a photo or PDF of your receipt. We&apos;ll extract the details
          automatically.
        </p>
      </div>

      <form action={uploadReceipt} className="space-y-5">
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="p-8">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-300 p-10 cursor-pointer transition-colors hover:border-zinc-400 hover:bg-zinc-50/50"
            >
              {/* Document/camera icon */}
              <svg
                className="h-10 w-10 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700">
                  Drag &amp; drop or click to upload
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  JPEG, PNG, WebP, or PDF up to 10MB
                </p>
              </div>
              <input
                id="file-upload"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
                className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:bg-zinc-800"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-zinc-900 py-2.5 text-white font-medium hover:bg-zinc-800 transition-colors"
        >
          Upload &amp; Process
        </button>
      </form>
    </div>
  );
}
