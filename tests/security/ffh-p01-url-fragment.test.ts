import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decodeFragment } from "../../lib/url-fragment.ts";

test("FFH-P01 malformed URL fragments decode to null instead of throwing", () => {
  assert.equal(decodeFragment("#expenses"), "expenses");
  assert.equal(decodeFragment("expenses"), "expenses");
  assert.equal(decodeFragment("#my%20section"), "my section");
  assert.equal(decodeFragment(""), null);
  assert.equal(decodeFragment("#"), null);
  // Independent review finding 5: invalid percent-encoding and truncated UTF-8.
  for (const bad of ["#%ZZ", "#%", "#%E2%82", "#%C3", "#expenses%"]) {
    assert.doesNotThrow(() => decodeFragment(bad), bad);
    assert.equal(decodeFragment(bad), null, bad);
  }
});

test("FFH-P01 profile navigation uses the safe fragment decoder", () => {
  for (const path of ["../../components/ProfileWorkspace.tsx", "../../components/ResponsiveDisclosure.tsx"]) {
    const file = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(file, /import \{ decodeFragment \} from "@\/lib\/url-fragment";/, path);
    assert.doesNotMatch(file, /decodeURIComponent\(/, path);
  }
});
