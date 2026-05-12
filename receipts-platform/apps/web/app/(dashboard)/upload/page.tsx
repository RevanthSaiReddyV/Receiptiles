import { uploadReceipt } from "@/lib/actions/upload";

export default function UploadPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">Upload Receipt</h1>
      <p className="mt-1 text-gray-600">
        Upload a photo or PDF of your receipt. We&apos;ll extract the details
        automatically.
      </p>

      <form action={uploadReceipt} className="mt-6 space-y-4">
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
          />
          <p className="mt-2 text-xs text-gray-400">
            JPEG, PNG, WebP, or PDF up to 10MB
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-black py-2.5 text-white font-medium hover:bg-gray-800"
        >
          Upload & Process
        </button>
      </form>
    </div>
  );
}
