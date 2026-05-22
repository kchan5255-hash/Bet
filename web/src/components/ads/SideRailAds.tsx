import { AdSlot } from "./AdSlot";

export function SideRailAds() {
  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 2xl:block"
    >
      <div className="pointer-events-auto">
        <AdSlot slot="side-rail-right" layout="sidebar" />
      </div>
    </aside>
  );
}
