import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildMonthlyMoneyFlow, type FlowInput } from "../../lib/calculations/monthly-money-flow.ts";
import { layoutMonthlyMoneyFlow, sankeyRibbon } from "../../lib/calculations/monthly-money-flow-layout.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const input = (overrides: Partial<FlowInput> = {}): FlowInput => ({
  monthlyIncome:4800, monthlyExpenses:3000, monthlyDebtMinimums:0,
  monthlyEmployeeRetirement:0,monthlyCashFlow:1800,
  hasActiveIncome:true,hasRecordedExpenses:true,
  expenses:[{category:"Housing",monthlyAmount:3000,isEssential:true}],
  ...overrides,
});
const model = (values: Partial<FlowInput> = {}) => buildMonthlyMoneyFlow(input(values));

test("A: the two-outcome basic household stays compact and reconciles to $4,800", () => {
  const f=model();
  assert.equal(f.status,"ready");
  assert.deepEqual(f.branches.filter(b=>b.cents>0).map(b=>[b.label,b.cents]),[
    ["Essential expenses",300000],["Remaining monthly cash flow",180000],
  ]);
  const l=layoutMonthlyMoneyFlow(f,false);
  assert.equal(l.expanded,false);
  assert.equal(l.edges.length,2);
  assert.equal(l.nodes.length,2);
  assert.ok(l.height>=210 && l.height<=340,`unnecessarily tall: ${l.height}`);
  assert.equal(f.branches.reduce((sum,b)=>sum+b.cents,0),480000);
  assert.ok(l.edges.every(e=>e.height>0 && e.path.includes(" C ")));
});

test("B: actual categories branch as multi-stage ribbons and reconcile exactly to parents", () => {
  const f=model({
    monthlyIncome:5000, monthlyExpenses:2800,monthlyDebtMinimums:200,
    monthlyEmployeeRetirement:500,monthlyCashFlow:1500,
    expenses:[
      {category:"Housing",monthlyAmount:1500,isEssential:true},
      {category:"Groceries",monthlyAmount:700,isEssential:true},
      {category:"Utilities",monthlyAmount:300,isEssential:true},
      {category:"Entertainment",monthlyAmount:300,isEssential:false},
    ],
  });
  assert.equal(f.status,"ready");
  assert.deepEqual(f.branches.map(b=>b.cents),[250000,30000,20000,50000,150000]);
  const expanded=layoutMonthlyMoneyFlow(f,true);
  assert.equal(expanded.expanded,true);
  assert.equal(expanded.edges.filter(e=>!e.child).length,5);
  assert.equal(expanded.edges.filter(e=>e.child).length,4);
  for (const parent of f.branches.filter(b=>b.categories.length>0)) {
    const children=expanded.edges.filter(e=>e.child && e.parentId===parent.id);
    assert.equal(children.reduce((sum,c)=>sum+c.cents,0),parent.cents);
    const root=expanded.nodes.find(n=>n.id===parent.id)!;
    assert.ok(Math.abs(children.reduce((sum,c)=>sum+c.height,0)-root.height)<1e-8);
    assert.ok(children.every(e=>e.x0>root.x && e.x1>e.x0 && e.y1>=root.y));
  }
  assert.equal(f.commitmentsCents+f.remainingCents,f.totalCents);
  assert.equal(f.totalCents,500000);
});

test("expense category collapse changes geometry but never mutates financial amounts", () => {
  const f=model();
  const before=JSON.stringify(f);
  const folded=layoutMonthlyMoneyFlow(f,false);
  const opened=layoutMonthlyMoneyFlow(f,true);
  const foldedAgain=layoutMonthlyMoneyFlow(f,false);
  assert.equal(folded.edges.filter(e=>e.child).length,0);
  assert.equal(opened.edges.filter(e=>e.child).length,1);
  assert.deepEqual(foldedAgain,folded);
  assert.equal(JSON.stringify(f),before);
});

test("adaptive spacing prevents parent and category node overlap with many real categories", () => {
  const expenses=Array.from({length:10},(_,i)=>({
    category:`Category ${i+1}`,monthlyAmount:100+(i%2)*50,isEssential:true,
  }));
  const sum=expenses.reduce((s,e)=>s+e.monthlyAmount,0);
  const f=model({monthlyExpenses:sum,monthlyCashFlow:4800-sum,expenses});
  assert.equal(f.status,"ready");
  const l=layoutMonthlyMoneyFlow(f,true);
  assert.equal(l.edges.filter(e=>e.child).length,10);
  assert.ok(l.height>layoutMonthlyMoneyFlow(f,false).height);
  assert.ok(l.height<900,`excessive chart height ${l.height}`);
  const children=l.nodes.filter(n=>n.parentId);
  for (let i=1;i<children.length;i++) {
    assert.ok(children[i].y>=children[i-1].y+children[i-1].height+30,
      `category collision at ${i}`);
  }
  assert.ok(l.height>children[children.length-1].y+children[children.length-1].height);
});

test("all rendered ribbons use positive visual widths even for one cent", () => {
  const f=model({monthlyExpenses:0.01,monthlyCashFlow:4799.99,
    expenses:[{category:"One-cent category",monthlyAmount:0.01,isEssential:true}]});
  const l=layoutMonthlyMoneyFlow(f,true);
  const leaf=l.edges.find(e=>e.child)!;
  assert.equal(leaf.cents,1);
  assert.ok(leaf.height>=2.2);
  assert.ok(l.edges.every(e=>e.height>0 && Number.isFinite(e.height)));
});

test("zero categories never create decorative ribbons or phantom category nodes", () => {
  const f=model({expenses:[
    {category:"Paid expense",monthlyAmount:3000,isEssential:true},
    {category:"Unused category",monthlyAmount:0,isEssential:true},
  ]});
  const l=layoutMonthlyMoneyFlow(f,true);
  assert.equal(l.edges.filter(e=>e.child).length,1);
  assert.ok(l.edges.every(e=>e.cents>0));
  assert.equal(f.branches[0].categories.reduce((s,c)=>s+c.cents,0),300000);
});

test("C: shortfall and positive sources are kept distinct, no negative ribbons", () => {
  const f=model({monthlyIncome:2500,monthlyCashFlow:-500});
  const l=layoutMonthlyMoneyFlow(f,true);
  assert.equal(f.shortfallCents,50000);
  assert.equal(f.remainingCents,0);
  assert.ok(l.sourceHeight>l.incomeHeight && l.incomeHeight>0);
  assert.ok(l.edges.every(e=>e.cents>0 && e.height>0));
  assert.equal(f.incomeCents+f.shortfallCents,f.totalCents);
});

test("D: incomplete, zero and inconsistent data do not create false flows", () => {
  const missing=model({hasActiveIncome:false});
  assert.equal(missing.status,"incomplete");
  assert.equal(layoutMonthlyMoneyFlow(missing,true).edges.length,0);
  const zero=model({monthlyIncome:0,monthlyExpenses:0,monthlyCashFlow:0,expenses:[]});
  assert.equal(zero.status,"ready");
  assert.equal(layoutMonthlyMoneyFlow(zero,true).edges.length,0);
  assert.equal(model({monthlyCashFlow:1700}).status,"unavailable");
});

test("cent precision and category totals remain authoritative independently of visual sizing", () => {
  const f=model({
    monthlyIncome:100.05,monthlyExpenses:0.05,monthlyCashFlow:100,
    expenses:[
      {category:"A",monthlyAmount:0.01,isEssential:true},
      {category:"B",monthlyAmount:0.04,isEssential:true},
    ],
  });
  assert.equal(f.status,"ready");
  const l=layoutMonthlyMoneyFlow(f,true);
  assert.equal(f.incomeCents,10005);
  assert.equal(f.branches[0].cents,5);
  assert.equal(l.edges.filter(e=>e.child).reduce((s,e)=>s+e.cents,0),5);
  assert.equal(f.remainingCents,10000);
  assert.equal(f.branches.reduce((s,b)=>s+b.cents,0),10005);
});

test("ribbon shape has matching top/bottom thickness and is deterministic", () => {
  const path=sankeyRibbon(200,500,20,90,8);
  assert.match(path,/^M 200 20 C /);
  assert.match(path,/ L 500 98 C /);
  assert.equal(path,sankeyRibbon(200,500,20,90,8));
});

test("presentation supports focus, mouse, click, touch button, state announcements and table", () => {
  const c=source("../../components/dashboard/MonthlyMoneyFlow.tsx");
  for (const expected of [
    "layoutMonthlyMoneyFlow(flow, showExpenseCategories)", "edge.child",
    "onMouseEnter","onFocus","onKeyDown","onClick","tabIndex={0}",
    "aria-expanded={showExpenseCategories}","aria-controls=\"money-flow-chart\"",
    'aria-live="polite"', 'role="alert"', 'role="img"',
    "<table>", "<caption>", "Unfunded monthly shortfall",
    "recorded monthly income", "not guaranteed discretionary spending",
    "flow.branches.flatMap", "category.cents",
  ]) assert.ok(c.includes(expected),expected);
  assert.doesNotMatch(c,/localStorage|sessionStorage|\.insert\(|\.update\(/);
  const css=source("../../app/globals.css");
  assert.match(css,/\.money-flow-canvas svg\{width:100%;height:auto;max-height:none/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css,/\.money-flow-ribbon:hover,\.money-flow-ribbon:focus-visible/);
  assert.match(css,/@media\(max-width:760px\)/);
});
