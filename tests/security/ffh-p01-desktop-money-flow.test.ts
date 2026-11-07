import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMonthlyMoneyFlow, type FlowInput } from "../../lib/calculations/monthly-money-flow.ts";
import { calculateFinancialSummary } from "../../lib/calculations/financial-summary.ts";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const example: FlowInput = {
  monthlyIncome: 4800,
  monthlyExpenses: 3000,
  monthlyDebtMinimums: 0,
  monthlyEmployeeRetirement: 0,
  monthlyCashFlow: 1800,
  hasActiveIncome: true,
  hasRecordedExpenses: true,
  expenses: [
    { category:"groceries", monthlyAmount:1200, isEssential:true },
    { category:"utilities", monthlyAmount:500, isEssential:true },
    { category:"entertainment", monthlyAmount:1300, isEssential:false },
  ],
};
const sum = (items: readonly { cents:number }[]) => items.reduce((amount,entry)=>amount+entry.cents,0);

test("desktop money flow precisely reconciles the synthetic $4,800 household", () => {
  const f=buildMonthlyMoneyFlow(example);
  assert.equal(f.status,"ready");
  assert.equal(f.incomeCents,480000);
  assert.equal(f.commitmentsCents,300000);
  assert.equal(f.remainingCents,180000);
  assert.equal(f.shortfallCents,0);
  assert.equal(sum(f.branches),f.totalCents);
  assert.equal(f.totalCents,480000);
  assert.deepEqual(f.branches.map(b=>b.cents),[170000,130000,0,0,180000]);
});

test("expense categories aggregate by essential/discretionary type without double counting", () => {
  const f=buildMonthlyMoneyFlow({...example,expenses:[
    {category:"Groceries",monthlyAmount:700,isEssential:true},
    {category:"Groceries",monthlyAmount:500,isEssential:true},
    {category:"utilities",monthlyAmount:500,isEssential:true},
    {category:"entertainment",monthlyAmount:1300,isEssential:false},
  ]});
  assert.equal(f.status,"ready");
  assert.deepEqual(f.branches[0].categories,[{label:"Groceries",cents:120000},{label:"utilities",cents:50000}]);
  assert.equal(sum(f.branches),f.incomeCents);
  assert.equal(f.branches[1].cents,130000);
});

test("debts and employee contributions are deducted once; employer contributions are never deducted", () => {
  const summary=calculateFinancialSummary({
    accountBalances:[],retirementBalances:[],debtBalances:[],
    monthlyIncome:[4800],monthlyExpenses:[3000],monthlyDebtPayments:[400],
    monthlyEmployeeRetirement:[300],monthlyEmployerRetirement:[900],
  });
  assert.equal(summary.monthlyCashFlow,1100);
  const f=buildMonthlyMoneyFlow({...example, monthlyDebtMinimums:400,monthlyEmployeeRetirement:300,monthlyCashFlow:summary.monthlyCashFlow});
  assert.equal(f.status,"ready");
  assert.deepEqual(f.branches.map(b=>b.cents),[170000,130000,40000,30000,110000]);
  assert.equal(f.remainingCents,110000);
  assert.equal(f.totalCents,480000);
});

test("negative cash flow uses a separately labeled unfunded shortfall, never a negative connector", () => {
  const f=buildMonthlyMoneyFlow({...example,monthlyIncome:2500,monthlyCashFlow:-500});
  assert.equal(f.status,"ready");
  assert.equal(f.shortfallCents,50000);
  assert.equal(f.remainingCents,0);
  assert.equal(f.incomeCents+f.shortfallCents,f.commitmentsCents);
  assert.ok(f.branches.every(b=>b.cents>=0));
});

test("empty or incomplete active income and expenses do not create a false complete picture", () => {
  assert.equal(buildMonthlyMoneyFlow({...example,hasActiveIncome:false}).status,"incomplete");
  assert.equal(buildMonthlyMoneyFlow({...example,hasRecordedExpenses:false}).status,"incomplete");
  const allZero=buildMonthlyMoneyFlow({...example,monthlyIncome:0,monthlyExpenses:0,monthlyCashFlow:0,expenses:[]});
  assert.equal(allZero.status,"ready");
  assert.equal(allZero.totalCents,0);
  assert.ok(allZero.branches.every(b=>b.cents===0));
});

test("unreconciled/invalid amounts fail closed instead of fabricating dollars", () => {
  assert.equal(buildMonthlyMoneyFlow({...example,monthlyCashFlow:1799}).status,"unavailable");
  assert.equal(buildMonthlyMoneyFlow({...example,monthlyExpenses:4000}).status,"unavailable");
  assert.equal(buildMonthlyMoneyFlow({...example,monthlyIncome:Number.NaN}).status,"unavailable");
  assert.equal(buildMonthlyMoneyFlow({...example,expenses:[...example.expenses,{category:"other",monthlyAmount:-1,isEssential:false}]}).status,"unavailable");
});

test("Sankey interactivity has keyboard, accessible text, category detail and accurate warning labels", () => {
  const component=read("../../components/dashboard/MonthlyMoneyFlow.tsx");
  const dashboard=read("../../app/dashboard/page.tsx");
  const styles=read("../../app/globals.css");
  for(const expected of ['role="img"','tabIndex={0}','onFocus','onMouseEnter','onKeyDown','<table>','<caption>','aria-expanded={showExpenseCategories}','role="alert"',"Unfunded","not guaranteed discretionary spending"]) assert.ok(component.includes(expected),expected);
  assert.match(dashboard, /<MonthlyMoneyFlow input=\{moneyFlowInput\} \/>/);
  assert.match(dashboard, /monthlyEmployeeRetirement: retirement\.reduce/);
  assert.match(dashboard, /hasActiveIncome: income\.some/);
  assert.match(styles, /\.money-flow-canvas svg\{width:100%;height:auto/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("desktop workspace selectors coexist with protected mobile controls and no new persisted state", () => {
  const profile=read("../../app/financial-profile/page.tsx");
  const planning=read("../../components/planning/PlanningCalculators.tsx");
  const profileWorkspace=read("../../components/ProfileWorkspace.tsx");
  const scenario=read("../../app/scenario-lab/ScenarioLabWorkspace.tsx");
  const styles=read("../../app/globals.css");
  assert.match(profile, /<ProfileWorkspace>/);
  assert.match(profile, /<ProfileSection id="accounts"/);
  assert.match(profileWorkspace, /"hashchange"/);
  assert.match(profileWorkspace, /aria-current=\{active === section\.id/);
  assert.match(planning, /className="planning-desktop-workspace"/);
  assert.match(planning, /className="mobile-planning-selector"/);
  assert.match(planning, /aria-pressed=\{activeTool === id\}/);
  assert.match(scenario, /scenario-mobile-glance/);
  const desktopNav = read("../../components/DesktopNavLink.tsx");
  const header = read("../../components/AppHeader.tsx");
  assert.match(desktopNav, /aria-current=\{selected \? "page"/);
  assert.match(header, /<DesktopNavLink key=\{href\}/);
  assert.match(styles, /\.site-nav a\[aria-current=page\]/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /\.profile-workspace-panels>\.desktop-profile-inactive\{display:block\}/);
  assert.match(styles, /\.planning-workspace-canvas>\.mobile-planning-tool\.mobile-active-tool\{display:block\}/);
  assert.doesNotMatch(profileWorkspace+planning, /localStorage|sessionStorage|supabase\./);
});
