import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { protectFocusedNumberFromWheel, type NumericWheelEnvironment } from "../../lib/dom/numeric-input-wheel.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

// Minimal input / scroller doubles drive the real shared event handler.
// Browser-owned wheel default is simulated separately: only an uncanceled
// focused number wheel would be allowed to change the field.
class NumberInput {
  type: string;
  value: string;
  parentElement: ScrollContainer | null;
  constructor(type = "number", value = "1500.25", parent: ScrollContainer | null = null) {
    this.type = type;
    this.value = value;
    this.parentElement = parent;
  }
}
class ScrollContainer {
  parentElement: ScrollContainer | null = null;
  scrollWidth = 0;
  clientWidth = 0;
  scrollLeft = 0;
  scrollHeight = 0;
  clientHeight = 0;
  scrollTop = 0;
}
const original = Object.getOwnPropertyDescriptor(globalThis, "HTMLInputElement");
Object.defineProperty(globalThis, "HTMLInputElement", { configurable: true, value: NumberInput });

function fixture(opts: {
  type?: string; amount?: string; focused?: boolean;
  deltaY?: number; deltaX?: number; deltaMode?: number;
  parent?: ScrollContainer | null; ctrlKey?: boolean; prevented?: boolean;
} = {}) {
  const input = new NumberInput(opts.type ?? "number", opts.amount ?? "1500.25", opts.parent ?? null);
  const calls: { dx: number; dy: number }[] = [];
  let prevented = Boolean(opts.prevented);
  const wheel = {
    target: input,
    deltaX: opts.deltaX ?? 0,
    deltaY: opts.deltaY ?? 120,
    deltaMode: opts.deltaMode ?? 0,
    ctrlKey: Boolean(opts.ctrlKey),
    get defaultPrevented() { return prevented; },
    preventDefault() { prevented = true; },
  } as unknown as WheelEvent;
  const env: NumericWheelEnvironment = {
    activeElement: opts.focused === false ? null : input as unknown as Element,
    viewportHeight: 750,
    getOverflow: () => ({x:"visible",y:"visible"}),
    scrollPage: (dx,dy) => { calls.push({dx,dy}); },
  };
  const simulateNativeDefaultStep = () => {
    if (!wheel.defaultPrevented && env.activeElement === (input as unknown as Element) && input.type === "number") {
      input.value = String(Number(input.value) + 1);
    }
  };
  return { input,wheel,env,calls,simulateNativeDefaultStep };
}

test("focused amount cannot step via wheel, even repeatedly after focus, while page scroll works", () => {
  const f = fixture({amount:"1500.25",deltaY:125});
  for (let n=0;n<3;n++) {
    assert.equal(protectFocusedNumberFromWheel(f.wheel,f.env), true);
    assert.equal(f.wheel.defaultPrevented,true);
    f.simulateNativeDefaultStep();
    assert.equal(f.input.value,"1500.25");
    assert.equal(f.env.activeElement,f.input as unknown as Element);
  }
  assert.deepEqual(f.calls,[{dx:0,dy:125},{dx:0,dy:125},{dx:0,dy:125}]);
});

test("typing still works after wheel; decimals, min/max/step are not rewritten", () => {
  const f=fixture({amount:"12.3456",deltaY:-43});
  const beforeAttributes={ type:f.input.type, min:"0", max:"1000000", step:"0.0001" };
  protectFocusedNumberFromWheel(f.wheel,f.env);
  f.simulateNativeDefaultStep();
  assert.equal(f.input.value,"12.3456");
  // The guard never changes type, focus, or user input attributes.
  assert.equal(f.input.type,beforeAttributes.type);
  assert.equal(f.env.activeElement,f.input as unknown as Element);
  f.input.value="6789.0123"; // typing can continue without refocusing
  assert.equal(f.input.value,"6789.0123");
  assert.deepEqual(f.calls,[{dx:0,dy:-43}]);
});

test("an unfocused number, text input, and unrelated wheel targets use native scrolling", () => {
  const unfocused=fixture({focused:false});
  assert.equal(protectFocusedNumberFromWheel(unfocused.wheel,unfocused.env),false);
  assert.equal(unfocused.wheel.defaultPrevented,false);
  assert.equal(unfocused.calls.length,0);
  const textField=fixture({type:"text"});
  assert.equal(protectFocusedNumberFromWheel(textField.wheel,textField.env),false);
  assert.equal(textField.wheel.defaultPrevented,false);
  const alreadyCanceled=fixture({prevented:true});
  assert.equal(protectFocusedNumberFromWheel(alreadyCanceled.wheel,alreadyCanceled.env),false);
  assert.equal(alreadyCanceled.calls.length,0);
});

test("nested scroll containers receive wheel movement before window, with boundary chaining", () => {
  const inner=new ScrollContainer();
  inner.scrollHeight=500; inner.clientHeight=200; inner.scrollTop=200;
  const outer=new ScrollContainer();
  outer.scrollHeight=1200; outer.clientHeight=300; outer.scrollTop=300;
  inner.parentElement=outer;
  const f=fixture({deltaY:170,parent:inner});
  f.env.getOverflow=()=>({x:"visible",y:"auto"});
  protectFocusedNumberFromWheel(f.wheel,f.env);
  assert.equal(inner.scrollTop,300); // consumed 100
  assert.equal(outer.scrollTop,370); // consumed remaining 70
  assert.equal(f.calls.length,0); // no extra page scroll
  f.simulateNativeDefaultStep();
  assert.equal(f.input.value,"1500.25");
  assert.equal(f.env.activeElement,f.input as unknown as Element);
});

test("scroll chaining reaches page when inner scrollport is at its limit", () => {
  const inner=new ScrollContainer();
  inner.scrollHeight=400;inner.clientHeight=200;inner.scrollTop=200;
  const f=fixture({deltaY:86,parent:inner});
  f.env.getOverflow=()=>({x:"visible",y:"auto"});
  protectFocusedNumberFromWheel(f.wheel,f.env);
  assert.equal(inner.scrollTop,200);
  assert.deepEqual(f.calls,[{dx:0,dy:86}]);
});

test("line/page wheel delta conversion and horizontal scrolling preserve page navigation", () => {
  const line=fixture({deltaY:3,deltaX:-2,deltaMode:1});
  protectFocusedNumberFromWheel(line.wheel,line.env);
  assert.deepEqual(line.calls,[{dx:-32,dy:48}]);
  const page=fixture({deltaY:1,deltaMode:2});
  protectFocusedNumberFromWheel(page.wheel,page.env);
  assert.deepEqual(page.calls,[{dx:0,dy:750}]);
  const zoom=fixture({ctrlKey:true});
  protectFocusedNumberFromWheel(zoom.wheel,zoom.env);
  assert.equal(zoom.wheel.defaultPrevented,true);
  assert.equal(zoom.calls.length,0);
});

test("one root-mounted, nonpassive capture listener guards every native numeric input", () => {
  const layout=source("../../app/layout.tsx");
  const component=source("../../components/NumericInputWheelGuard.tsx");
  const handler=source("../../lib/dom/numeric-input-wheel.ts");
  assert.match(layout, /<NumericInputWheelGuard \/>/);
  assert.match(layout, /<AppHeader \/>/);
  assert.match(component, /document\.addEventListener\("wheel", onWheel, \{ capture: true, passive: false \}\)/);
  assert.match(component, /document\.removeEventListener\("wheel", onWheel, true\)/);
  assert.match(handler, /event\.preventDefault\(\)/);
  assert.match(handler, /target\.type !== "number"/);
  assert.match(handler, /environment\.activeElement !== target/);
  assert.doesNotMatch(handler+component, /\.blur\(|\.value\s*=|type\s*=\s*["']text["']/);
  assert.doesNotMatch(handler+component,/localStorage|sessionStorage|\.insert\(|\.update\(/);
});

test("Financial Profile, Planning, Paycheck, Scenario Lab and onboarding still use native number inputs", () => {
  const paths=[
    "../../app/financial-profile/page.tsx",
    "../../components/planning/PlanningCalculators.tsx",
    "../../components/planning/PaycheckPlanner.tsx",
    "../../components/planning/DebtPayoffCalculator.tsx",
    "../../components/planning/RetirementPacingCalculator.tsx",
    "../../app/scenario-lab/ScenarioLabWorkspace.tsx",
    "../../app/scenario-lab/AssumptionComposer.tsx",
    "../../app/onboarding/page.tsx",
  ];
  for(const path of paths) {
    const page=source(path);
    assert.match(page,/type="number"|type:\s*"number"/,`No numeric input found: ${path}`);
  }
});

test.after(() => {
  if (original) Object.defineProperty(globalThis,"HTMLInputElement",original);
  else Reflect.deleteProperty(globalThis,"HTMLInputElement");
});
