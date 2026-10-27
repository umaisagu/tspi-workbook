export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-slate-900">TSPi Workbook</p>
          <p className="text-sm text-slate-600">TMA3084 Software Engineering Lab · UNIMAS</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
