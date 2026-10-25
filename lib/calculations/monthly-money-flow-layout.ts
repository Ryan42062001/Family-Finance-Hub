import type { MoneyFlow, FlowBranch } from "./monthly-money-flow.ts";

/** Geometry only: never adjust the reconciled dollar/cents values. */
export type SankeyFlowId = FlowBranch["id"];
export type SankeyNode = {
  id: string;
  parentId?: SankeyFlowId;
  label: string;
  cents: number;
  x: number;
  y: number;
  height: number;
};
export type SankeyEdge = {
  id: string;
  parentId: SankeyFlowId;
  child: boolean;
  label: string;
  cents: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  height: number;
  path: string;
};
export type SankeyLayout = {
  width: number;
  height: number;
  sourceX: number;
  sourceY: number;
  sourceHeight: number;
  incomeHeight: number;
  nodes: readonly SankeyNode[];
  edges: readonly SankeyEdge[];
  expanded: boolean;
};

export function sankeyRibbon(x0: number, x1: number, y0: number, y1: number, height: number): string {
  // Cubic top and bottom share exact thickness at both endpoints.
  const bend0 = x0 + (x1 - x0) * 0.45;
  const bend1 = x0 + (x1 - x0) * 0.55;
  return `M ${x0} ${y0} C ${bend0} ${y0} ${bend1} ${y1} ${x1} ${y1} L ${x1} ${y1 + height} C ${bend1} ${y1 + height} ${bend0} ${y0 + height} ${x0} ${y0 + height} Z`;
}
const positive = (n: number) => Number.isFinite(n) && n > 0;
const floorPx = 2.25;
const categoryGap = 38;
const groupGap = 31;

export function layoutMonthlyMoneyFlow(flow: MoneyFlow, expandCategories: boolean): SankeyLayout {
  const branches = flow.branches.filter(branch => branch.cents > 0);
  const expanded = expandCategories && branches.some(b => b.categories.some(c => c.cents > 0));
  const width = expanded ? 1240 : 1010;
  const x1 = expanded ? 180 : 170;
  const x2 = expanded ? 520 : 495;
  const x3 = 850;
  const top = 92;
  // The total visual band is intentionally bounded so two destinations remain
  // compact; thin flows have a documented visual minimum but exact tooltips/table.
  const thickness = 104 + Math.min(30, branches.length * 7);
  const branchHeights = branches.map(b => {
    const childCount = expanded ? b.categories.filter(c => c.cents > 0).length : 0;
    return Math.max(floorPx, childCount * floorPx, flow.totalCents > 0 ? thickness * b.cents / flow.totalCents : 0);
  });
  const sourceHeight = branchHeights.reduce((s, h) => s + h, 0);
  const incomeHeight = sourceHeight * (flow.totalCents > 0 ? flow.incomeCents / flow.totalCents : 0);
  const nodes: SankeyNode[] = [];
  const edges: SankeyEdge[] = [];
  let sourceCursor = top;
  let groupCursor = top;
  branches.forEach((b, index) => {
    const h = branchHeights[index];
    const categories = expanded ? b.categories.filter(c => c.cents > 0) : [];
    // Each visible category gets its own labelled row. The main group reserves
    // that height before the next branch, so stages cannot overlap vertically.
    const rowHeight = Math.max(h + groupGap, categories.length ? (categories.length - 1) * categoryGap + h + groupGap : 0);
    const y2 = groupCursor;
    nodes.push({ id:b.id, label:b.label, cents:b.cents, x:x2, y:y2, height:h });
    edges.push({
      id:b.id, parentId:b.id, child:false, label:b.label, cents:b.cents,
      x0:x1+18, x1:x2, y0:sourceCursor, y1:y2, height:h,
      path:sankeyRibbon(x1+18, x2, sourceCursor, y2, h),
    });
    if (categories.length) {
      const exact = categories.reduce((s, c) => s + c.cents, 0);
      // Cent reconciliation is owned by buildMonthlyMoneyFlow. A broken
      // parent/category relationship is a data error, not a layout decision.
      if (exact !== b.cents) throw new Error("Category cents do not match their parent");
      // Allocate pixel thickness proportionally and keep tiny categories
      // discoverable; redistribute without changing any financial amounts.
      const minimum = Math.min(floorPx, h / categories.length);
      const remainingPx = h - minimum * categories.length;
      const pixelHeights = categories.map(c => minimum + (remainingPx * c.cents / b.cents));
      let childSourceY = y2;
      let childTargetY = y2;
      categories.forEach((c, i) => {
        const childH = pixelHeights[i];
        const childY = childTargetY;
        const id = `${b.id}:${i}`;
        nodes.push({id, parentId:b.id, label:c.label, cents:c.cents, x:x3, y:childY, height:childH});
        edges.push({
          id, parentId:b.id, child:true, label:c.label, cents:c.cents,
          x0:x2+18, x1:x3, y0:childSourceY, y1:childY, height:childH,
          path:sankeyRibbon(x2+18, x3, childSourceY, childY, childH),
        });
        childSourceY += childH;
        childTargetY += childH + categoryGap;
      });
    }
    sourceCursor += h;
    groupCursor += rowHeight;
  });
  const childBottom = nodes.filter(n=>n.parentId).reduce((y,n)=>Math.max(y,n.y+n.height),0);
  const groupBottom = nodes.filter(n=>!n.parentId).reduce((y,n)=>Math.max(y,n.y+n.height),0);
  const height = Math.ceil(Math.max(top + sourceHeight, childBottom, groupBottom) + 53);
  return { width, height, sourceX:x1, sourceY:top, sourceHeight, incomeHeight, nodes, edges, expanded };
}
