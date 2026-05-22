import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnalysisData } from "@/lib/analysis.functions";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function riskColor(score: number) {
  if (score >= 75) return "oklch(0.62 0.22 25)"; // extreme
  if (score >= 55) return "oklch(0.72 0.19 55)"; // high
  if (score >= 35) return "oklch(0.82 0.16 90)"; // moderate
  return "oklch(0.72 0.17 145)"; // low
}

// ISO numeric -> ISO3 (subset for top producers — fallback uses any)
// react-simple-maps uses ISO 3166-1 numeric ids in the topojson
const NUM_TO_ISO3: Record<string, string> = {
  "004":"AFG","008":"ALB","012":"DZA","024":"AGO","032":"ARG","036":"AUS","040":"AUT",
  "048":"BHR","050":"BGD","056":"BEL","068":"BOL","076":"BRA","100":"BGR","124":"CAN",
  "152":"CHL","156":"CHN","170":"COL","178":"COG","180":"COD","188":"CRI","192":"CUB",
  "196":"CYP","203":"CZE","208":"DNK","218":"ECU","222":"SLV","231":"ETH","246":"FIN",
  "250":"FRA","268":"GEO","276":"DEU","288":"GHA","300":"GRC","320":"GTM","324":"GIN",
  "328":"GUY","332":"HTI","340":"HND","344":"HKG","348":"HUN","352":"ISL","356":"IND",
  "360":"IDN","364":"IRN","368":"IRQ","372":"IRL","376":"ISR","380":"ITA","384":"CIV",
  "388":"JAM","392":"JPN","398":"KAZ","400":"JOR","404":"KEN","410":"KOR","414":"KWT",
  "417":"KGZ","418":"LAO","422":"LBN","426":"LSO","428":"LVA","430":"LBR","434":"LBY",
  "440":"LTU","442":"LUX","450":"MDG","454":"MWI","458":"MYS","466":"MLI","478":"MRT",
  "484":"MEX","496":"MNG","504":"MAR","508":"MOZ","512":"OMN","516":"NAM","524":"NPL",
  "528":"NLD","554":"NZL","558":"NIC","562":"NER","566":"NGA","578":"NOR","586":"PAK",
  "591":"PAN","598":"PNG","600":"PRY","604":"PER","608":"PHL","616":"POL","620":"PRT",
  "624":"GNB","630":"PRI","634":"QAT","642":"ROU","643":"RUS","646":"RWA","682":"SAU",
  "686":"SEN","688":"SRB","694":"SLE","702":"SGP","703":"SVK","704":"VNM","705":"SVN",
  "706":"SOM","710":"ZAF","716":"ZWE","724":"ESP","728":"SSD","729":"SDN","752":"SWE",
  "756":"CHE","760":"SYR","762":"TJK","764":"THA","768":"TGO","780":"TTO","784":"ARE",
  "788":"TUN","792":"TUR","795":"TKM","800":"UGA","804":"UKR","818":"EGY","826":"GBR",
  "834":"TZA","840":"USA","854":"BFA","858":"URY","860":"UZB","862":"VEN","887":"YEM",
  "894":"ZMB",
};

export function WorldRiskMap({ sourcing }: { sourcing: AnalysisData["sourcing"] }) {
  const byIso = new Map(sourcing.map((s) => [s.iso3.toUpperCase(), s]));

  return (
    <TooltipProvider delayDuration={50}>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">Global sourcing — risk by country</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Legend />
          </div>
        </div>
        <div className="overflow-hidden rounded-md bg-background/40">
          <ComposableMap
            projectionConfig={{ scale: 145 }}
            width={900}
            height={420}
            style={{ width: "100%", height: "auto" }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const id = String(geo.id).padStart(3, "0");
                  const iso3 = NUM_TO_ISO3[id];
                  const entry = iso3 ? byIso.get(iso3) : undefined;
                  const fill = entry ? riskColor(entry.risk_score) : "oklch(0.26 0.025 250)";
                  const stroke = entry ? "oklch(0.96 0.01 250 / 0.4)" : "oklch(0.35 0.03 250)";
                  const node = (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: { fill, stroke, strokeWidth: 0.5, outline: "none" },
                        hover: { fill, stroke: "oklch(0.96 0.01 250)", strokeWidth: 1, outline: "none", cursor: entry ? "pointer" : "default" },
                        pressed: { fill, outline: "none" },
                      }}
                    />
                  );
                  if (!entry) return node;
                  return (
                    <Tooltip key={geo.rsmKey}>
                      <TooltipTrigger asChild>{node}</TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-medium">{entry.country}</div>
                          <div>Share: {entry.share_pct.toFixed(1)}%</div>
                          <div>Risk: {entry.risk_score}/100</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Legend() {
  const items = [
    { c: "oklch(0.72 0.17 145)", l: "Low" },
    { c: "oklch(0.82 0.16 90)", l: "Moderate" },
    { c: "oklch(0.72 0.19 55)", l: "High" },
    { c: "oklch(0.62 0.22 25)", l: "Extreme" },
  ];
  return (
    <>
      {items.map((i) => (
        <span key={i.l} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.c }} />
          {i.l}
        </span>
      ))}
    </>
  );
}