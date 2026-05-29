import { createFileRoute } from "@tanstack/react-router";

// Best-effort alert delivery for user-supplied Slack webhooks / email relays.
// Email path requires RESEND_API_KEY (configurable in Settings). Slack path
// posts directly to the user's incoming-webhook URL (no auth needed by Slack).
export const Route = createFileRoute("/api/public/alert-deliver")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            channel?: "slack" | "email";
            destination?: string;
            subject?: string;
            text?: string;
          };
          const { channel, destination, subject, text } = body;
          if (!channel || !destination || !text) {
            return json({ ok: false, error: "missing fields" }, 400);
          }

          if (channel === "slack") {
            if (!/^https:\/\/hooks\.slack\.com\//.test(destination)) {
              return json({ ok: false, error: "invalid slack webhook" }, 400);
            }
            const r = await fetch(destination, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ text: `*${subject ?? "SupplyRisk alert"}*\n${text}` }),
            });
            return json({ ok: r.ok, status: r.status });
          }

          if (channel === "email") {
            const key = process.env.RESEND_API_KEY;
            if (!key) return json({ ok: false, error: "email transport not configured" }, 501);
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
              body: JSON.stringify({
                from: "SupplyRisk <alerts@resend.dev>",
                to: [destination],
                subject: subject ?? "SupplyRisk alert",
                text,
              }),
            });
            return json({ ok: r.ok, status: r.status });
          }

          return json({ ok: false, error: "unknown channel" }, 400);
        } catch (e) {
          return json({ ok: false, error: (e as Error).message }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}