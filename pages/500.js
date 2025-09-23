import Link from 'next/link';

export default function Custom500() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="error-page">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-gray-300">500</h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900" data-testid="error-message">
            Server Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Something went wrong on our end. Please try again later.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
