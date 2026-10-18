import { secureServe } from "../shared/http.ts";
import { corsHeaders, errorResponse } from "../shared/utils.ts";
// Proxy bids are resolved inside place_funded_bid, never as independent writes.
secureServe((req) =>
  req.method === "OPTIONS"
    ? new Response("ok", { headers: corsHeaders })
    : errorResponse(
        "Proxy bidding is processed atomically by process-bid",
        410,
      ),
);
