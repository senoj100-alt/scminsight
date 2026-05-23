import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAIStructured, currentDateAnchor, UserKeySchema } from "./ai-call.server";

const RerouteSchema = z.object({
  scenario: z.string(),
  alternative_route: z.array(
    z.object({
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
      type: z.enum(["origin", "port", "airport", "hub", "border", "destination"]),
    })
  ),
  lead_time_delta_days: z.number(),
  cost_delta_pct: z.number(),
  new_risks: z.array(z.string()),
  mitigations: z.array(z.string()),
  commentary: z.string(),
});

export type RerouteResult = z.infer<typeof RerouteSchema>;

export const simulateReroute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    origin: string;
    destination: string;
    mode: "air" | "sea" | "road";
    avoid: string;
    userKey?: unknown;
  }) =>
    z.object({
      origin: z.string().min(1).max(120),
      destination: z.string().min(1).max(120),
      mode: z.enum(["air", "sea", "road"]),
      avoid: z.string().min(1).max(120),
      userKey: UserKeySchema,
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const date = currentDateAnchor();
    const system = `You are a senior logistics analyst. The current date is ${date.month} ${date.year}. When asked to reroute a shipment, return a realistic alternative routing with 3-6 waypoints (real coordinates), the lead-time delta in days and the cost delta as a percentage versus the baseline routing, plus the new risks introduced and mitigations.`;
    const user = `A ${data.mode} shipment from ${data.origin} to ${data.destination} normally transits ${data.avoid}. Simulate the alternative routing that AVOIDS ${data.avoid}. Provide the alternative waypoint list (real lat/lng), lead_time_delta_days vs baseline, cost_delta_pct vs baseline (positive = more expensive), new_risks introduced by the detour, and mitigations.`;

    const raw = await callAIStructured({
      userKey: data.userKey,
      system,
      user,
      toolName: "return_reroute",
      toolDescription: "Return a what-if rerouting scenario",
      parameters: {
        type: "object",
        properties: {
          scenario: { type: "string" },
          alternative_route: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                lat: { type: "number" },
                lng: { type: "number" },
                type: { type: "string", enum: ["origin", "port", "airport", "hub", "border", "destination"] },
              },
              required: ["name", "lat", "lng", "type"],
            },
          },
          lead_time_delta_days: { type: "number" },
          cost_delta_pct: { type: "number" },
          new_risks: { type: "array", items: { type: "string" } },
          mitigations: { type: "array", items: { type: "string" } },
          commentary: { type: "string" },
        },
        required: ["scenario", "alternative_route", "lead_time_delta_days", "cost_delta_pct", "new_risks", "mitigations", "commentary"],
      },
    });

    return { reroute: RerouteSchema.parse(raw) };
  });