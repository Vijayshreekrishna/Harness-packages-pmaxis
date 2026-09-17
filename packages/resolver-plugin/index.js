import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "resolver-tools";
export const inject = ["tools"];

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: "fetch_market",
    description: "Fetch a Polymarket market question and its resolution rules text.",
    parameters: {
      market_id: {
        type: "string",
        required: true,
        description: "Polymarket conditionId (0x...) or market slug."
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          market_id: { type: "string", required: true },
          question: { type: "string", required: true },
          rules_text: { type: "string", required: true },
          rules_hash: { type: "string", required: true },
          resolution_source_field: { type: "string", required: true },
          end_date: { type: "string", required: true },
          status: { type: "string", required: true },
          uma_bond: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{
        type: "text",
        text: "Market: " + value.question + "\n\nRules:\n" + value.rules_text
      }]
    },
    async execute(args) {
      const id = args.market_id;
      const key = id.startsWith("0x") ? "condition_ids" : "slug";
      const url = "https://gamma-api.polymarket.com/markets?" + key + "=" + encodeURIComponent(id);
      const r = await fetch(url);
      if (!r.ok) throw new Error("polymarket " + r.status);
      const rows = await r.json();
      const m = Array.isArray(rows) ? rows[0] : rows;
      if (!m) throw new Error("market not found");
      const rules = m.description ?? "";
      return {
        market_id: m.conditionId ?? id,
        question: m.question ?? "",
        rules_text: rules,
        rules_hash: createHash("sha256").update(rules).digest("hex"),
        resolution_source_field: m.resolutionSource || "",
        end_date: m.endDate ?? "",
        status: m.closed ? "closed" : "open",
        uma_bond: String(m.umaBond ?? "")
      };
    }
  }));

  ctx.tools.register(defineTool({
    name: "write_verdict",
    description: "Write the resolution verdict JSON to output.json. Call once, then stop.",
    parameters: {
      verdict_json: {
        type: "string",
        required: true,
        description: "The verdict as a JSON string."
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          bytes: { type: "integer", required: true }
        }
      },
      render: (_args, value) => [{
        type: "text",
        text: "Wrote output.json (" + value.bytes + " bytes)."
      }]
    },
    async execute(args) {
      const text = args.verdict_json;
      writeFileSync(join(process.cwd(), "output.json"), text);
      return { ok: true, bytes: Buffer.byteLength(text, "utf8") };
    }
  }));
}
