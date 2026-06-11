"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  items: React.ReactNode[];
  limit?: number;
  className?: string;
}

export function CollapsibleList({ items, limit = 3, className = "space-y-3" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - limit;
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <div>
      <div className={className}>
        {visible}
      </div>
      {items.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: "#9A9688" }}
        >
          {expanded
            ? <><ChevronUp size={13} /> Ver menos</>
            : <><ChevronDown size={13} /> Ver mais {hidden} {hidden === 1 ? "item" : "itens"}</>
          }
        </button>
      )}
    </div>
  );
}
