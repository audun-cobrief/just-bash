import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

describe("jq filtered deletion", () => {
  it.each([
    [
      '{"arr":["a","b","c"]}',
      'del(.arr[] | select(. == "b"))',
      '{"arr":["a","c"]}',
    ],
    [
      '{"arr":["b","a","b","b","c","b"]}',
      'del(.arr[] | select(. == "b"))',
      '{"arr":["a","c"]}',
    ],
    [
      '{"arr":["a","c"]}',
      'del(.arr[] | select(. == "b"))',
      '{"arr":["a","c"]}',
    ],
    ['{"arr":["b","b"]}', 'del(.arr[] | select(. == "b"))', '{"arr":[]}'],
    ['{"arr":[]}', 'del(.arr[] | select(. == "b"))', '{"arr":[]}'],
    [
      '{"arr":["a","b","c"]}',
      '[path(.arr[] | select(. == "b"))]',
      '[["arr",1]]',
    ],
    [
      '{"arr":["a","b","c"]}',
      "[path(.arr[])]",
      '[["arr",0],["arr",1],["arr",2]]',
    ],
    [
      '{"arr":[{"drop":true,"v":1},{"drop":false,"v":2}]}',
      "del(.arr[] | select(.drop) | .v)",
      '{"arr":[{"drop":true},{"drop":false,"v":2}]}',
    ],
    [
      '{"a":[[1,2,3],[2,2],[3]]}',
      "del(.a[][] | select(. == 2))",
      '{"a":[[1,3],[],[3]]}',
    ],
    [
      '{"a":{"x":1,"y":2,"z":2}}',
      "del(.a[] | select(. == 2))",
      '{"a":{"x":1}}',
    ],
    [
      '{"arr":["a","b","c","d"]}',
      "del(.arr[1], .arr[1], .arr[-3])",
      '{"arr":["a","c","d"]}',
    ],
    [
      '{"arr":[{"x":1},{"x":2},{"x":3}]}',
      "del(.arr[0], .arr[1].x)",
      '{"arr":[{},{"x":3}]}',
    ],
    ["[[1],null,[2]]", "del(.[][]?)", "[[],null,[]]"],
    ["[[1],null,[2]]", "[path(.[][]?)]", "[[0,0],[2,0]]"],
    ["[[1],null,[2]]", "del((.[][])?)", "[[],null,[2]]"],
    ['[{"x":1},4,{"x":2}]', "del(.[].x?)", "[{},4,{}]"],
    ['[{"x":1},4,{"x":2}]', "[path(.[].x?)]", '[[0,"x"],[2,"x"]]'],
    ["[1,2,3]", "del(.[-0.5])", "[1,2,3]"],
    ["[1,2,3]", "del(.[-1.5])", "[1,2]"],
    ["[1,2,3,2]", "del(first(.[] | select(. == 2)))", "[1,3,2]"],
    ["[1,2,3]", "del(limit(2; .[]))", "[3]"],
    ["[1,[2]]", "del(nth(1; .[]))", "[1]"],
    ['{"a":1,"b":2}', "del(if .a then .a else .b end)", '{"b":2}'],
    ['{"a":1,"b":2}', "del(.c // .b)", '{"a":1}'],
    ['{"a":{"b":1}}', 'del(getpath(["a","b"]))', '{"a":{}}'],
    ['{"a":"x"}', 'del(.a | ltrimstr("z"))', "{}"],
    ['{"a":1,"b":2}', "del(.a as $x | .b)", '{"a":1}'],
    ['{"a":1}', "del(label $f | .a)", "{}"],
    ['{"a":1}', "del(try .a)", "{}"],
    ["[1,[2,[3]]]", "del(recurse | numbers)", "[[[]]]"],
  ])("%s | %s", async (input, filter, output) => {
    const env = new Bash({ files: { "/input.json": input } });
    const result = await env.exec(`jq -c '${filter}' /input.json`);
    expect(result.stdout).toBe(`${output}\n`);
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  it.each([
    [
      '[{"x":1},4,{"x":2}]',
      "del(.[].x)",
      'Cannot index number with string "x"',
    ],
    ['{"a":1}', "del(.a.b)", 'Cannot index number with string "b"'],
    ['{"a":{"b":1}}', "del(.a[0])", "Cannot index object with number"],
  ])("rejects %s | %s instead of treating the member as missing", async (input, filter, error) => {
    const env = new Bash({ files: { "/input.json": input } });
    const result = await env.exec(`jq -c '${filter}' /input.json`);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(`jq: parse error: ${error}\n`);
    expect(result.exitCode).toBe(5);
  });

  it("rejects value-producing filters instead of deleting the root", async () => {
    const env = new Bash();
    const result = await env.exec(
      `echo '{"arr":[1,2]}' | jq 'del(.arr | map(. + 1))'`,
    );
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "jq: parse error: Invalid path expression with result [2,3]\n",
    );
    expect(result.exitCode).toBe(5);
  });
});
