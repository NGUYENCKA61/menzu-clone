import Image from "next/image";

/**
 * Fixed full-viewport background artwork that sits behind every section.
 * Live site: `div.fixed.top-0.left-0.w-full.h-[100vh].z-[-1].overflow-hidden.pointer-events-none`
 * containing an `img.object-cover.object-center.transition-all.duration-700` and a
 * `div.absolute.inset-0.bg-[#0a0a0d]/70` dim overlay.
 */
export function PageBackdrop() {
  return (
    <div className="fixed top-0 left-0 w-full h-[100vh] z-[-1] overflow-hidden pointer-events-none">
      <Image
        src="/sites/menzu-lol-f7ae197a/root-8a5edab2/images/behance/e4307d166239615.6418bdb0084a4.png"
        alt="Home Background"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center transition-all duration-700"
      />
      <div className="absolute inset-0 bg-[#0a0a0d]/70" />
    </div>
  );
}
