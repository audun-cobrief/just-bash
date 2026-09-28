import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

describe("jq type-filter deletion", () => {
  it.each([
    ["numbers", '[null,false,"x",[],{}]'],
    ["strings", "[null,false,3,[],{}]"],
    ["booleans", '[null,3,"x",[],{}]'],
    ["nulls", '[false,3,"x",[],{}]'],
    ["arrays", '[null,false,3,"x",{}]'],
    ["objects", '[null,false,3,"x",[]]'],
    ["iterables", '[null,false,3,"x"]'],
    ["scalars", "[[],{}]"],
    ["values", "[null]"],
  ])("retains paths through %s", async (filter, output) => {
    const env = new Bash({
      files: { "/input.json": '[null,false,3,"x",[],{}]' },
    });
    const result = await env.exec(`jq -c 'del(.[] | ${filter})' /input.json`);
    expect(result.stdout).toBe(`${output}\n`);
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  it.each([
    ['{"a":3}', "del(.a | numbers)", "{}"],
    ['{"a":"keep"}', "del(.a | numbers)", '{"a":"keep"}'],
    ['{"a":{"b":1}}', "del(.a | objects | .b | numbers)", '{"a":{}}'],
    [
      '{"i":"y","a":{"i":"x","x":1,"y":2}}',
      "del(.a[.i])",
      '{"i":"y","a":{"i":"x","x":1}}',
    ],
    ['{"i":"y","a":{"i":"x","x":1,"y":2}}', "path(.a[.i])", '["a","y"]'],
    ['{"a":3}', "del(.a | tonumber)", "{}"],
    ['{"a":"x"}', "del(.a | tostring)", "{}"],
  ])("%s | %s", async (input, filter, output) => {
    const env = new Bash({ files: { "/input.json": input } });
    const result = await env.exec(`jq -c '${filter}' /input.json`);
    expect(result.stdout).toBe(`${output}\n`);
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  it.each([
    ['{"a":3}', ". + 0", "3"],
    ['{"a":3}', "length", "3"],
    ['{"a":"3"}', "tonumber", "3"],
    ['{"a":3}', "tostring", '"3"'],
  ])("rejects %s | %s because it does not return its input", async (input, filter, preview) => {
    const env = new Bash({ files: { "/input.json": input } });
    const result = await env.exec(`jq -c 'del(.a | ${filter})' /input.json`);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      `jq: parse error: Invalid path expression with result ${preview}\n`,
    );
    expect(result.exitCode).toBe(5);
  });
});
