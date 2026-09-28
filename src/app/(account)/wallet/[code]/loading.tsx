/**
 * The invoice for the half-second before it exists: the breadcrumb pill, the
 * title and the two panels at their real measurements, so the page that
 * replaces it lands on the same lines. The account group's own skeleton draws
 * a sidebar this page does not have.
 */
export default function TopUpInvoiceLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải"
      className="relative w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col min-h-screen animate-pulse motion-reduce:animate-none"
    >
      <div className="mb-4 h-11 w-[420px] max-w-full rounded-full bg-white/[0.04]" />
      <div className="mb-6 h-8 w-64 max-w-full rounded-xl bg-white/[0.04]" />
      <div className="flex flex-col-reverse lg:flex-row gap-4 lg:gap-6">
        <div className="h-[630px] w-full flex-[1.4] rounded-[24px] border border-white/[0.08] bg-white/[0.02]" />
        <div className="h-[630px] w-full flex-1 lg:max-w-[440px] rounded-[24px] border border-white/[0.08] bg-white/[0.02]" />
      </div>
    </div>
  );
}
