import { RecommendChip, RecommendChipList } from "./RecommendChipList";

interface BankerData {
  banker: { no: string; name: string };
  legs: { no: string; name: string }[];
}

interface BoxData {
  numbers: string[];
  combos: string[];
  combosLabel: string;
  nameByNo: Map<string, string>;
}

interface BetSuggestionCardProps {
  variant: "banker" | "box";
  banker?: BankerData | null;
  box?: BoxData | null;
}

export function BetSuggestionCard({ variant, banker, box }: BetSuggestionCardProps) {
  if (variant === "banker" && banker) {
    return (
      <div className="space-y-2">
        <Row label="膽">
          <RecommendChip
            no={banker.banker.no}
            name={banker.banker.name}
            variant="solid"
          />
        </Row>
        <Row label="拖">
          <RecommendChipList
            items={banker.legs.map((l) => ({ no: l.no, name: l.name }))}
            variant="outline"
          />
        </Row>
      </div>
    );
  }

  if (variant === "box" && box) {
    return (
      <div className="space-y-2">
        <Row label="馬腳">
          <RecommendChipList
            items={box.numbers.map((no) => ({
              no,
              name: box.nameByNo.get(no) ?? "",
            }))}
            variant="outline"
          />
        </Row>
        <Row label="串">
          <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-[11px] text-text-muted">
            {box.combosLabel}
          </span>
        </Row>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border-subtle bg-bg-subtle/50 p-3 text-center text-[11px] text-text-subtle">
      未有對應推介
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-7 shrink-0 text-[10px] uppercase tracking-wider text-text-subtle">
        {label}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  );
}
