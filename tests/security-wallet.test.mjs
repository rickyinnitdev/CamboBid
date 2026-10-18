import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Actual PostgreSQL functions/RLS run in WASM. Only Supabase Auth/Storage schemas
// are stubbed; no cloud account, real identity or payment credentials are used.
test("account security, financial authorization and settlement", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const user = "10000000-0000-0000-0000-000000000001",
    other = "10000000-0000-0000-0000-000000000002",
    seller = "10000000-0000-0000-0000-000000000003",
    admin = "10000000-0000-0000-0000-000000000004",
    unverified = "10000000-0000-0000-0000-000000000005";
  await db.exec(`
 CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE PUBLICATION supabase_realtime;
 CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}',
 raw_app_meta_data jsonb DEFAULT '{"providers":["email"]}',email_confirmed_at timestamptz,last_sign_in_at timestamptz);
 CREATE TABLE auth.mfa_factors(id uuid DEFAULT gen_random_uuid(),user_id uuid,status text);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
 GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth,storage TO anon,authenticated,service_role;
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
 GRANT ALL ON storage.objects TO authenticated,service_role;
 `);
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  ).sort()) {
    try {
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    } catch (e) {
      throw new Error("Migration " + file + ": " + e.message);
    }
  }
  const sql = async (text, args = []) => db.query(text, args);
  const value = async (text, args = []) =>
    Object.values((await sql(text, args)).rows[0])[0];
  const as = async (id, fn, aal = "aal2", role = "authenticated") => {
    await db.exec("SET ROLE " + role);
    await sql("SELECT set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: id, aal, role }),
    ]);
    try {
      return await fn();
    } finally {
      await db.exec("RESET ROLE");
      await sql("SELECT set_config('request.jwt.claims','{}',false)");
    }
  };
  const rejects = (fn, pattern) => assert.rejects(fn, pattern);
  for (const id of [user, other, seller, admin, unverified])
    await sql(
      "INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,CASE WHEN $3 THEN now() END)",
      [id, id + "@example.test", id !== unverified],
    );
  await sql("UPDATE public.profiles SET role='super_admin' WHERE id=$1", [
    admin,
  ]);
  await sql(
    "UPDATE public.profiles SET identity_status='approved',identity_verified=true,bid_limit=100 WHERE id=ANY($1::uuid[])",
    [[user, other, seller]],
  );
  for (const id of [user, other, seller, admin]) {
    await sql(
      "INSERT INTO auth.mfa_factors(user_id,status) VALUES($1,'verified')",
      [id],
    );
    await as(id, () =>
      sql("SELECT public.accept_policies('demo-2.0','demo-1.0')"),
    );
  }
  await t.test("protect privileged fields and private profiles", async () => {
    await as(user, () =>
      rejects(
        () => sql("UPDATE profiles SET role='super_admin' WHERE id=$1", [user]),
        /Sensitive account/,
      ),
    );
    await as(user, () =>
      rejects(
        () =>
          sql("UPDATE profiles SET identity_verified=false WHERE id=$1", [
            user,
          ]),
        /Sensitive account/,
      ),
    );
    await as(user, () =>
      rejects(
        () =>
          sql("UPDATE profiles SET terms_accepted_version='fake' WHERE id=$1", [
            user,
          ]),
        /Sensitive account/,
      ),
    );
    await as(user, () =>
      sql("UPDATE profiles SET display_name='Bidder A' WHERE id=$1", [user]),
    );
    assert.equal(
      await as(user, () =>
        value("SELECT count(*)::integer FROM profiles WHERE id=$1", [other]),
      ),
      0,
    );
    assert.equal(
      await as(user, () =>
        value("SELECT count(*)::integer FROM public_profiles"),
      ),
      5,
    );
    await as(user, () =>
      rejects(
        () =>
          sql("SELECT public.wallet_move($1,'demo',100,0,'forged',null)", [
            user,
          ]),
        /permission denied/,
      ),
    );
    await as(user, () =>
      rejects(
        () =>
          sql(
            "INSERT INTO bids(auction_id,bidder_id,amount) VALUES(gen_random_uuid(),$1,20)",
            [user],
          ),
        /permission denied/,
      ),
    );
    await as(
      admin,
      () => rejects(() => sql("SELECT public.admin_user_directory()"), /MFA/),
      "aal1",
    );
  });
  await t.test(
    "eligibility requires email, identity, MFA and current policies",
    async () => {
      await as(
        user,
        () =>
          rejects(
            () => sql("SELECT public.require_eligible()"),
            /authenticator/,
          ),
        "aal1",
      );
      await as(unverified, () =>
        rejects(
          () => sql("SELECT public.require_eligible()"),
          /Confirmed email/,
        ),
      );
      await as(user, () => sql("SELECT public.require_eligible()"));
      await sql("UPDATE profiles SET suspended=true WHERE id=$1", [user]);
      await as(user, () =>
        rejects(() => sql("SELECT public.require_eligible()"), /suspended/),
      );
      await sql("UPDATE profiles SET suspended=false WHERE id=$1", [user]);
      await as(user, () =>
        rejects(
          () => sql("SELECT public.accept_policies('fake','demo-1.0')"),
          /Policies changed/,
        ),
      );
    },
  );
  const checkout = async (
    id,
    amount,
    mode = "demo",
    order = null,
    expired = false,
  ) => {
    const p = crypto.randomUUID();
    await sql(
      "INSERT INTO payment_checkouts(id,user_id,amount_minor,mode,order_id,expires_at) VALUES($1,$2,$3,$4,$5,now()+ $6::interval)",
      [p, id, amount, mode, order, expired ? "-1 minute" : "5 minutes"],
    );
    return p;
  };
  await t.test(
    "idempotent receipts, isolation and duplicate hash rejection",
    async () => {
      const p = await checkout(user, 10000);
      await as(user, () =>
        rejects(
          () => sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]),
          /permission denied/,
        ),
      );
      await as(
        user,
        () => sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]),
        "aal2",
        "service_role",
      );
      await as(
        user,
        () => sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]),
        "aal2",
        "service_role",
      );
      assert.equal(
        Number(
          await value(
            "SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='demo'",
            [user],
          ),
        ),
        10000,
      );
      assert.equal(
        await value(
          "SELECT count(*)::integer FROM wallet_ledger WHERE reference=$1",
          [p],
        ),
        1,
      );
      const live = await checkout(user, 500, "live");
      const hash = "a".repeat(64);
      await sql("SELECT complete_checkout($1,$2)", [live, hash]);
      const duplicate = await checkout(other, 500, "live");
      await rejects(
        () => sql("SELECT complete_checkout($1,$2)", [duplicate, hash]),
        /unique constraint/,
      );
      assert.equal(
        await value("SELECT status FROM payment_checkouts WHERE id=$1", [
          duplicate,
        ]),
        "pending",
      );
      assert.equal(
        Number(
          await value(
            "SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='demo'",
            [user],
          ),
        ),
        10000,
      );
      const late = await checkout(other, 500, "demo", null, true);
      assert.equal(
        (await value("SELECT complete_checkout($1,$2)", [late, "demo-" + late]))
          .status,
        "reconciliation",
      );
      assert.equal(
        await value(
          "SELECT count(*)::integer FROM wallet_ledger WHERE reference=$1",
          [late],
        ),
        0,
      );
      const funding = await checkout(other, 10000);
      await sql("SELECT complete_checkout($1,$2)", [
        funding,
        "demo-" + funding,
      ]);
    },
  );
  const auction = async (reserve = 0) => {
    const listing = crypto.randomUUID(),
      a = crypto.randomUUID(),
      category = crypto.randomUUID();
    await sql(
      "INSERT INTO categories(id,name,slug) VALUES($1::uuid,'Demo',$1::uuid::text)",
      [category],
    );
    await sql(
      "INSERT INTO listings(id,seller_id,title,starting_price,reserve_price,status,category_id) VALUES($1,$2,'Demo item',10,$3,'live',$4)",
      [listing, seller, reserve, category],
    );
    await sql(
      "INSERT INTO auctions(id,listing_id,status,start_time,end_time,original_end_time,current_price,bid_increment) VALUES($1,$2,'live',now()-interval '1 minute',now()+interval '2 minutes',now()+interval '2 minutes',10,1)",
      [a, listing],
    );
    return a;
  };
  const bid = (id, a, amount, cap = null) =>
    as(id, () => value("SELECT place_funded_bid($1,$2,$3)", [a, amount, cap]));
  const available = (id) =>
    value(
      "SELECT available::integer FROM wallet_accounts WHERE user_id=$1 AND mode='demo'",
      [id],
    );
  const reserved = (id) =>
    value(
      "SELECT reserved::integer FROM wallet_accounts WHERE user_id=$1 AND mode='demo'",
      [id],
    );
  let a, order;
  await t.test(
    "competing bids reserve, release, extend and reject overspending",
    async () => {
      a = await auction();
      await bid(user, a, 2000);
      assert.equal(await available(user), 8000);
      assert.equal(await reserved(user), 2000);
      assert.equal(
        await value("SELECT status::text FROM auctions WHERE id=$1", [a]),
        "extended",
      );
      await bid(other, a, 3000);
      assert.equal(await available(user), 10000);
      assert.equal(await reserved(user), 0);
      await bid(other, a, 4000);
      assert.equal(await reserved(other), 4000);
      await rejects(() => bid(user, a, 11000), /Insufficient/);
      await rejects(() => bid(seller, a, 5000), /own item/);
      await as(admin, () =>
        rejects(
          () => sql("UPDATE auctions SET status='closed' WHERE id=$1", [a]),
          /secure auction|permission denied/,
        ),
      );
      await as(admin, () =>
        rejects(() => sql("SELECT close_funded_auction($1)", [a]), /timer/),
      );
    },
  );
  await t.test(
    "atomic auction settlement and buyer delivery release",
    async () => {
      await sql(
        "UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",
        [a],
      );
      const result = await as(admin, () =>
        value("SELECT close_funded_auction($1)", [a]),
      );
      order = result.escrow_id;
      assert.equal(
        await value(
          "SELECT status::text FROM escrow_transactions WHERE id=$1",
          [order],
        ),
        "held",
      );
      assert.equal(await reserved(other), 0);
      assert.equal(await available(other), 6000);
      await as(admin, () => sql("SELECT close_funded_auction($1)", [a]));
      assert.equal(
        await value(
          "SELECT count(*)::integer FROM escrow_transactions WHERE auction_id=$1",
          [a],
        ),
        1,
      );
      await as(user, () =>
        rejects(
          () => sql("SELECT settle_order($1,'release')", [order]),
          /Unauthorized/,
        ),
      );
      await as(other, () => sql("SELECT settle_order($1,'release')", [order]));
      assert.equal(await available(seller), 4000);
      await as(other, () =>
        rejects(
          () => sql("SELECT settle_order($1,'release')", [order]),
          /held orders/,
        ),
      );
      await as(admin, () =>
        rejects(
          () => sql("UPDATE auctions SET status='live' WHERE id=$1", [a]),
          /secure auction|permission denied/,
        ),
      );
    },
  );
  await t.test(
    "proxy maximum reservation and settlement use only final price",
    async () => {
      const proxy = await auction();
      await bid(user, proxy, 2000, 6000);
      assert.equal(await reserved(user), 6000);
      await bid(other, proxy, 3000);
      assert.equal(
        await value("SELECT winner_id FROM auctions WHERE id=$1", [proxy]),
        user,
      );
      assert.equal(
        Number(
          await value("SELECT current_price FROM auctions WHERE id=$1", [
            proxy,
          ]),
        ),
        31,
      );
      assert.equal(await reserved(other), 0);
      await rejects(() => bid(user, proxy, 4000, 5000), /cannot be reduced/);
      await sql(
        "UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",
        [proxy],
      );
      const result = await as(admin, () =>
        value("SELECT close_funded_auction($1)", [proxy]),
      );
      assert.equal(await reserved(user), 0);
      assert.equal(await available(user), 6900);
      await as(admin, () =>
        sql("SELECT settle_order($1,'refund','Assessment refund')", [
          result.escrow_id,
        ]),
      );
      assert.equal(await available(user), 10000);
    },
  );
  await t.test(
    "reserve failure releases funds and creates no order",
    async () => {
      const noSale = await auction(100);
      await bid(user, noSale, 2000);
      await sql(
        "UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",
        [noSale],
      );
      const result = await as(admin, () =>
        value("SELECT close_funded_auction($1)", [noSale]),
      );
      assert.equal(result.escrow_id, null);
      assert.equal(await available(user), 10000);
      assert.equal(await reserved(user), 0);
    },
  );
  await t.test(
    "manual identity review requires independent MFA staff",
    async () => {
      const path = unverified + "/sample.png";
      await sql("UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1", [
        unverified,
      ]);
      await sql(
        "INSERT INTO storage.objects(bucket_id,name) VALUES('identity-documents',$1)",
        [path],
      );
      await as(unverified, () =>
        sql("SELECT accept_policies('demo-2.0','demo-1.0')"),
      );
      await as(unverified, () => sql("SELECT submit_identity($1)", [path]));
      await as(user, () =>
        rejects(
          () => sql("SELECT review_identity($1,true)", [unverified]),
          /staff/,
        ),
      );
      await as(
        admin,
        () =>
          rejects(
            () => sql("SELECT review_identity($1,true)", [unverified]),
            /MFA/,
          ),
        "aal1",
      );
      await as(admin, () =>
        sql("SELECT review_identity($1,false,'Sample is unreadable',$2)", [
          unverified,
          path,
        ]),
      );
      assert.equal(
        await value("SELECT identity_status FROM profiles WHERE id=$1", [
          unverified,
        ]),
        "rejected",
      );
      await as(unverified, () => sql("SELECT submit_identity($1)", [path]));
      await as(admin, () =>
        rejects(
          () =>
            sql("SELECT review_identity($1,true,null,'wrong/path.png')", [
              unverified,
            ]),
          /Document changed/,
        ),
      );
      await as(admin, () =>
        sql("SELECT review_identity($1,true,null,$2)", [unverified, path]),
      );
      assert.equal(
        await value("SELECT identity_verified FROM profiles WHERE id=$1", [
          unverified,
        ]),
        true,
      );
      assert.equal(
        await value(
          "SELECT count(*)::integer FROM identity_reviews WHERE user_id=$1",
          [unverified],
        ),
        2,
      );
    },
  );
  await t.test(
    "disputes freeze funds and block release until staff resolves them",
    async () => {
      const disputed = await auction();
      await bid(user, disputed, 2000);
      await sql(
        "UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",
        [disputed],
      );
      const result = await as(admin, () =>
        value("SELECT close_funded_auction($1)", [disputed]),
      );
      const dispute = await as(user, () =>
        value(
          "INSERT INTO disputes(auction_id,filer_id,respondent_id,reason) VALUES($1,$2,$3,'Sample item mismatch') RETURNING id",
          [disputed, user, seller],
        ),
      );
      assert.equal(
        await value(
          "SELECT status::text FROM escrow_transactions WHERE id=$1",
          [result.escrow_id],
        ),
        "frozen",
      );
      await as(user, () =>
        rejects(
          () => sql("SELECT settle_order($1,'release')", [result.escrow_id]),
          /held orders/,
        ),
      );
      await as(admin, () =>
        rejects(
          () => sql("SELECT settle_order($1,'release')", [result.escrow_id]),
          /open dispute/,
        ),
      );
      await as(user, () =>
        rejects(
          () =>
            sql("UPDATE disputes SET status='resolved' WHERE id=$1", [dispute]),
          /Staff must decide/,
        ),
      );
      await as(admin, () =>
        sql(
          "UPDATE disputes SET status='resolved',resolution='Demonstration refund' WHERE id=$1",
          [dispute],
        ),
      );
      await as(admin, () =>
        sql("SELECT settle_order($1,'refund')", [result.escrow_id]),
      );
      assert.equal(await available(user), 10000);
    },
  );
  await t.test(
    "pending legacy orders can be paid once by verified checkout",
    async () => {
      const legacy = await auction();
      const order = crypto.randomUUID();
      await sql(
        "INSERT INTO escrow_transactions(id,auction_id,buyer_id,seller_id,amount) VALUES($1,$2,$3,$4,25)",
        [order, legacy, user, seller],
      );
      const p = await checkout(user, 2500, "demo", order);
      await sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]);
      await sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]);
      assert.equal(
        await value(
          "SELECT status::text FROM escrow_transactions WHERE id=$1",
          [order],
        ),
        "held",
      );
      assert.equal(await available(user), 10000);
      await as(admin, () => sql("SELECT settle_order($1,'refund')", [order]));
      assert.equal(await available(user), 12500);
    },
  );
  await t.test(
    "reconciliation consumes a verified late receipt once",
    async () => {
      const p = await checkout(user, 500, "demo", null, true);
      await sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]);
      await as(user, () =>
        rejects(
          () =>
            sql("SELECT reconcile_payment($1,'Verified assessment receipt')", [
              p,
            ]),
          /Super admin/,
        ),
      );
      await as(admin, () =>
        sql("SELECT reconcile_payment($1,'Verified assessment receipt')", [p]),
      );
      assert.equal(await available(user), 13000);
      await as(admin, () =>
        rejects(
          () =>
            sql("SELECT reconcile_payment($1,'Verified assessment receipt')", [
              p,
            ]),
          /verified unmatched/,
        ),
      );
      assert.equal(await available(user), 13000);
    },
  );
  await t.test(
    "one-cent checkouts issue private immutable receipts exactly once",
    async () => {
      const p = await checkout(other, 1);
      await sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]);
      await sql("SELECT complete_checkout($1,$2)", [p, "demo-" + p]);
      assert.equal(
        await value(
          "SELECT count(*)::integer FROM billing_documents WHERE checkout_id=$1",
          [p],
        ),
        1,
      );
      assert.equal(
        await as(user, () =>
          value(
            "SELECT count(*)::integer FROM billing_documents WHERE checkout_id=$1",
            [p],
          ),
        ),
        0,
      );
      assert.equal(
        await as(other, () =>
          value(
            "SELECT count(*)::integer FROM billing_documents WHERE checkout_id=$1",
            [p],
          ),
        ),
        1,
      );
      await rejects(
        () =>
          sql(
            "UPDATE billing_documents SET amount_minor=100 WHERE checkout_id=$1",
            [p],
          ),
        /immutable/,
      );
      await as(other, () =>
        rejects(
          () => sql("SELECT * FROM integration_secrets"),
          /permission denied/,
        ),
      );
      await as(other, () =>
        rejects(
          () => sql("UPDATE payment_settings SET mode='live'"),
          /permission denied/,
        ),
      );
      const job = await value(
        "SELECT id FROM document_email_queue WHERE document_id=(SELECT id FROM billing_documents WHERE checkout_id=$1)",
        [p],
      );
      assert.equal(
        (await sql("SELECT * FROM claim_document_email($1)", [job])).rows
          .length,
        1,
      );
      assert.equal(
        (await sql("SELECT * FROM claim_document_email($1)", [job])).rows
          .length,
        0,
      );
      await sql(
        "UPDATE document_email_queue SET first_attempt_at=now()-interval '25 hours',leased_at=now()-interval '25 hours' WHERE id=$1",
        [job],
      );
      assert.equal(
        (await sql("SELECT * FROM claim_document_email($1)", [job])).rows
          .length,
        0,
      );
      assert.equal(
        await value("SELECT status FROM document_email_queue WHERE id=$1", [
          job,
        ]),
        "review",
      );
      await rejects(() => checkout(other, 0), /check constraint/);
    },
  );
  await t.test(
    "one-cent sample first bid and live environment gates",
    async () => {
      await as(admin, () =>
        rejects(
          () => sql("SELECT create_sample_auctions(1,2,'live')"),
          /enable live/,
        ),
      );
      const result = await as(admin, () =>
        value("SELECT create_sample_auctions(1,2,'demo')"),
      );
      const id = result[0].id;
      await as(other, () => sql("SELECT place_funded_bid($1,1)", [id]));
      assert.equal(
        Number(
          await value("SELECT current_price FROM auctions WHERE id=$1", [id]),
        ),
        0.01,
      );
      await as(user, () =>
        rejects(() => sql("SELECT place_funded_bid($1,1)", [id]), /minimum/),
      );
      await as(user, () => sql("SELECT place_funded_bid($1,2)", [id]));
      assert.equal(
        Number(
          await value("SELECT current_price FROM auctions WHERE id=$1", [id]),
        ),
        0.02,
      );
    },
  );
  await t.test(
    "approved listings start atomically with real-mode and staff safeguards",
    async () => {
      const listing = crypto.randomUUID(),
        category = crypto.randomUUID();
      await sql(
        "INSERT INTO categories(id,name,slug) VALUES($1::uuid,'Start test',$1::uuid::text)",
        [category],
      );
      await sql(
        "INSERT INTO listings(id,seller_id,title,starting_price,status,category_id) VALUES($1,$2,'Approved mouse',0.01,'approved',$3)",
        [listing, seller, category],
      );
      const start = (who, mode = "demo", aal = "aal2") =>
        as(
          who,
          () =>
            value("SELECT start_approved_auction($1,0.01,0.01,0.01,2,1,1,$2)", [
              listing,
              mode,
            ]),
          aal,
        );
      await rejects(() => start(user), /staff with MFA/);
      await rejects(() => start(admin, "demo", "aal1"), /staff with MFA/);
      await rejects(() => start(admin, "live"), /Enable real KHQR/);
      const a = await start(admin);
      assert.equal(a.status, "live");
      assert.equal(a.type, "english");
      assert.equal(a.payment_mode, "demo");
      assert.equal(
        await value("SELECT status FROM listings WHERE id=$1", [listing]),
        "live",
      );
      await rejects(() => start(admin), /approved listing/);
      await as(admin, () =>
        sql("SELECT configure_auction($1,0.01,0.01,1,1)", [a.id]),
      );
      await as(seller, () =>
        rejects(() => sql("SELECT place_funded_bid($1,1)", [a.id]), /own item/),
      );
      await sql(
        "UPDATE auctions SET end_time=now()+interval '10 seconds' WHERE id=$1",
        [a.id],
      );
      await bid(user, a.id, 1);
      assert.equal(
        Number(
          await value("SELECT extension_count FROM auctions WHERE id=$1", [
            a.id,
          ]),
        ),
        1,
      );
      await as(admin, () =>
        rejects(
          () => sql("SELECT configure_auction($1,0.01,0.01,1,1)", [a.id]),
          /locked after the first bid/,
        ),
      );
      await sql(
        "UPDATE auctions SET end_time=now()+interval '10 seconds' WHERE id=$1",
        [a.id],
      );
      const result = await bid(other, a.id, 2);
      assert.equal(result.timer_extended, false);
      assert.equal(
        Number(
          await value("SELECT extension_count FROM auctions WHERE id=$1", [
            a.id,
          ]),
        ),
        1,
      );
    },
  );
  await t.test(
    "Buy Now settles once, releases competing holds, and issues paid documents",
    async () => {
      const a = await auction();
      await sql(
        "UPDATE listings SET buy_it_now_price=20 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",
        [a],
      );
      await bid(other, a, 1000, 3000);
      const otherBefore = Number(await available(other));
      const userBefore = Number(await available(user));
      await as(seller, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,2000)", [a]),
          /own item/,
        ),
      );
      await as(user, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,1)", [a]),
          /price changed/,
        ),
      );
      await as(
        user,
        () =>
          rejects(
            () => value("SELECT buy_funded_auction($1,2000)", [a]),
            /authenticator/,
          ),
        "aal1",
      );
      const order = await as(user, () =>
        value("SELECT buy_funded_auction($1,2000)", [a]),
      );
      assert.equal(Number(await available(user)), userBefore - 2000);
      assert.equal(Number(await available(other)), otherBefore + 3000);
      assert.equal(
        Number(
          await value(
            "SELECT count(*) FROM bid_authorizations WHERE auction_id=$1",
            [a],
          ),
        ),
        0,
      );
      assert.equal(
        await value("SELECT status FROM auctions WHERE id=$1", [a]),
        "closed",
      );
      assert.equal(
        await value(
          "SELECT status FROM listings WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",
          [a],
        ),
        "sold",
      );
      assert.equal(
        await value("SELECT status FROM escrow_transactions WHERE id=$1", [
          order.order_id,
        ]),
        "held",
      );
      assert.equal(
        Number(
          await value(
            "SELECT count(*) FROM billing_documents WHERE order_id=$1",
            [order.order_id],
          ),
        ),
        2,
      );
      const retry = await as(user, () =>
        value("SELECT buy_funded_auction($1,2000)", [a]),
      );
      assert.equal(retry.order_id, order.order_id);
      assert.equal(Number(await available(user)), userBefore - 2000);
      await as(other, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,2000)", [a]),
          /no longer available/,
        ),
      );
      assert.equal(
        Number(
          await value(
            "SELECT count(*) FROM escrow_transactions WHERE auction_id=$1",
            [a],
          ),
        ),
        1,
      );
      await as(admin, () => value("SELECT close_funded_auction($1)", [a]));
      assert.equal(
        Number(
          await value(
            "SELECT count(*) FROM escrow_transactions WHERE auction_id=$1",
            [a],
          ),
        ),
        1,
      );
    },
  );
  await t.test(
    "Buy Now preserves funds on rejection and can consume the buyer's own reservation",
    async () => {
      const a = await auction();
      await sql(
        "UPDATE listings SET buy_it_now_price=1000 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",
        [a],
      );
      await bid(user, a, 1000, 3000);
      const before = Number(await available(user));
      await as(other, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,100000)", [a]),
          /Insufficient/,
        ),
      );
      assert.equal(
        Number(
          await value(
            "SELECT cap FROM bid_authorizations WHERE auction_id=$1",
            [a],
          ),
        ),
        3000,
      );
      assert.equal(Number(await available(user)), before);
      await sql(
        "UPDATE listings SET buy_it_now_price=20 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",
        [a],
      );
      await as(user, () => value("SELECT buy_funded_auction($1,2000)", [a]));
      assert.equal(Number(await available(user)), before + 1000);
      const b = await auction();
      await as(user, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,2000)", [b]),
          /not available/,
        ),
      );
      await sql(
        "UPDATE listings SET buy_it_now_price=5 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",
        [b],
      );
      await as(user, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,500)", [b]),
          /not available/,
        ),
      );
      await sql(
        "UPDATE listings SET buy_it_now_price=20 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",
        [b],
      );
      await sql(
        "UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",
        [b],
      );
      await as(user, () =>
        rejects(
          () => value("SELECT buy_funded_auction($1,2000)", [b]),
          /no longer available/,
        ),
      );
    },
  );
  await t.test(
    "scheduled settlement creates a held order once and keeps seller money pending delivery",
    async () => {
      const a = await auction();
      await bid(other, a, 1000);
      const sellerBefore = Number((await available(seller)) || 0);
      await as(other, () =>
        rejects(
          () => value("SELECT settle_expired_auctions()"),
          /permission denied/,
        ),
      );
      await as(admin, () =>
        rejects(
          () => value("SELECT settle_auction_internal($1)", [a]),
          /permission denied/,
        ),
      );
      await sql(
        "UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",
        [a],
      );
      await value("SELECT settle_expired_auctions(100)");
      const order = await value(
        "SELECT id FROM escrow_transactions WHERE auction_id=$1",
        [a],
      );
      assert.ok(order);
      assert.equal(
        await value("SELECT status FROM escrow_transactions WHERE id=$1", [
          order,
        ]),
        "held",
      );
      assert.equal(Number((await available(seller)) || 0), sellerBefore);
      assert.equal(
        Number(
          await value(
            "SELECT count(*) FROM billing_documents WHERE order_id=$1",
            [order],
          ),
        ),
        2,
      );
      await value("SELECT settle_expired_auctions(100)");
      assert.equal(
        Number(
          await value(
            "SELECT count(*) FROM escrow_transactions WHERE auction_id=$1",
            [a],
          ),
        ),
        1,
      );
      await as(other, () =>
        value("SELECT settle_order($1,'release')", [order]),
      );
      assert.equal(Number(await available(seller)), sellerBefore + 1000);
      await as(other, () =>
        rejects(
          () => value("SELECT settle_order($1,'release')", [order]),
          /Only held orders/,
        ),
      );
    },
  );
  const withdraw = (who,id,amount=100,mode='demo',fingerprint='v2:'+'f'.repeat(64)) => as(who,()=>value("SELECT request_withdrawal($1,$2,$3,'ABA · 1234',$4,$5)",[id,mode,amount,'encrypted-fixture-'.repeat(8),fingerprint]));
  await t.test("withdrawal requests reserve once, remain private, and cancel exactly once",async()=>{
    const id=crypto.randomUUID(),before=Number(await available(user)),held=Number(await reserved(user));
    await withdraw(user,id,100);await withdraw(user,id,100);
    assert.equal(Number(await available(user)),before-100);assert.equal(Number(await reserved(user)),held+100);
    assert.equal(Number(await value("SELECT count(*) FROM wallet_ledger WHERE reference=$1",[id])),1);
    await rejects(()=>withdraw(user,id,101),/different details/);
    await rejects(()=>withdraw(other,id,100),/different details/);
    await rejects(()=>withdraw(user,crypto.randomUUID(),0),/Invalid withdrawal/);
    await as(other,()=>rejects(()=>value("SELECT cancel_withdrawal($1)",[id]),/not found/));
    assert.equal(Number(await as(other,()=>value("SELECT count(*) FROM withdrawal_requests WHERE id=$1",[id]))),0);
    await as(user,()=>rejects(()=>sql("SELECT * FROM withdrawal_destinations"),/permission denied/));
    await as(user,()=>rejects(()=>sql("UPDATE withdrawal_requests SET status='paid' WHERE id=$1",[id]),/permission denied/));
    await as(user,()=>value("SELECT cancel_withdrawal($1)",[id]));await as(user,()=>value("SELECT cancel_withdrawal($1)",[id]));
    assert.equal(Number(await available(user)),before);assert.equal(Number(await reserved(user)),held);
    assert.equal(Number(await value("SELECT count(*) FROM wallet_ledger WHERE reference=$1",[id])),2);
    assert.equal((await as(admin,()=>value("SELECT withdrawal_balance_report()"))).issues.length,0);
  });
  await t.test("finance review claims prevent conflicting payouts and duplicate bank references",async()=>{
    await sql("UPDATE profiles SET role='escrow_manager' WHERE id=$1",[seller]);
    const id=crypto.randomUUID();await withdraw(user,id,100);
    await as(user,()=>rejects(()=>value("SELECT review_withdrawal($1,'review')",[id]),/Finance staff/));
    await as(admin,()=>rejects(()=>value("SELECT review_withdrawal($1,'review')",[id]),/Finance staff/),'aal1');
    await as(admin,()=>value("SELECT review_withdrawal($1,'review')",[id]));
    await as(seller,()=>rejects(()=>value("SELECT review_withdrawal($1,'review')",[id]),/no longer awaiting/));
    await as(seller,()=>rejects(()=>value("SELECT review_withdrawal($1,'paid','BANK-REFERENCE-001')",[id]),/Claim this request/));
    await as(user,()=>rejects(()=>value("SELECT cancel_withdrawal($1)",[id]),/awaiting review/));
    await as(admin,()=>rejects(()=>value("SELECT review_withdrawal($1,'paid','bad')",[id]),/actual bank transfer reference/));
    const held=Number(await reserved(user));
    await as(admin,()=>value("SELECT review_withdrawal($1,'paid','Bank-Reference-001','Test bank transfer recorded')",[id]));
    await as(admin,()=>value("SELECT review_withdrawal($1,'paid','bank-reference-001')",[id]));
    assert.equal(Number(await reserved(user)),held-100);
    const another=crypto.randomUUID();await withdraw(user,another,100);
    await as(seller,()=>value("SELECT review_withdrawal($1,'review')",[another]));
    await as(seller,()=>rejects(()=>value("SELECT review_withdrawal($1,'paid','BANK-REFERENCE-001')",[another]),/already recorded/));
    await as(seller,()=>rejects(()=>value("SELECT review_withdrawal($1,'reject',null,'short')",[another]),/at least 10/));
    const before=Number(await available(user));
    await as(seller,()=>value("SELECT review_withdrawal($1,'reject',null,'Destination could not be verified')",[another]));
    await as(seller,()=>value("SELECT review_withdrawal($1,'reject',null,'Destination could not be verified')",[another]));
    assert.equal(Number(await available(user)),before+100);
    assert.equal((await as(admin,()=>value("SELECT withdrawal_balance_report()"))).issues.length,0);
  });
  await t.test("withdrawal holds cannot fund bids or Buy Now; mode isolation and suspended payouts are enforced",async()=>{
    const balance=Number(await available(user)),id=crypto.randomUUID();await withdraw(user,id,balance);
    const a=await auction();await sql("UPDATE listings SET buy_it_now_price=20 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",[a]);
    await rejects(()=>bid(user,a,1000),/Insufficient/);
    await as(user,()=>rejects(()=>value("SELECT buy_funded_auction($1,2000)",[a]),/Insufficient/));
    await as(user,()=>value("SELECT cancel_withdrawal($1)",[id]));
    const live=crypto.randomUUID();const demoBefore=Number(await available(user));await withdraw(user,live,1,'live');assert.equal(Number(await available(user)),demoBefore);
    await as(admin,()=>value("SELECT review_withdrawal($1,'review')",[live]));
    await sql("UPDATE profiles SET suspended=true WHERE id=$1",[user]);
    await as(admin,()=>rejects(()=>value("SELECT review_withdrawal($1,'paid','LIVE-BANK-001')",[live]),/suspended/));
    await sql("UPDATE profiles SET suspended=false WHERE id=$1",[user]);
    await as(admin,()=>value("SELECT review_withdrawal($1,'reject',null,'Live test withdrawn before transfer')",[live]));
    await sql("UPDATE profiles SET role='auctioneer' WHERE id=$1",[seller]);
    await as(seller,()=>rejects(()=>value("SELECT withdrawal_balance_report()"),/Finance staff/));
    await sql("UPDATE profiles SET role='casual_visitor' WHERE id=$1",[seller]);
  });
  await t.test("balance checks detect account/ledger mismatches without changing money",async()=>{
    await sql("UPDATE wallet_accounts SET available=available+1 WHERE user_id=$1 AND mode='demo'",[user]);
    assert.equal((await as(admin,()=>value("SELECT withdrawal_balance_report()"))).issues.length,1);
    await sql("UPDATE wallet_accounts SET available=available-1 WHERE user_id=$1 AND mode='demo'",[user]);
    assert.equal((await as(admin,()=>value("SELECT withdrawal_balance_report()"))).issues.length,0);
  });
  await t.test("direct KHQR is idempotent and preserves receipts across a payment pause", async () => {
    const a=await auction();await sql("UPDATE auctions SET payment_mode='live' WHERE id=$1",[a]);
    await sql("UPDATE listings SET buy_it_now_price=10 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",[a]);
    const before=Number(await value("SELECT coalesce(sum(available),0)::integer FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user]));
    const p=crypto.randomUUID();await sql("INSERT INTO payment_checkouts(id,user_id,mode,amount_minor,expires_at,auction_id) VALUES($1,$2,'live',1000,now()+interval '5 minutes',$3)",[p,user,a]);
    await as(user,()=>rejects(()=>value("SELECT buy_verified_qr_internal($1,1000,$2)",[a,user]),/permission denied/));
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[p,'bc'.repeat(32)]),'aal2','service_role');
    const order=await value("SELECT purchased_order_id FROM payment_checkouts WHERE id=$1",[p]);assert.ok(order);
    assert.equal(await value("SELECT status FROM escrow_transactions WHERE id=$1",[order]),'held');
    assert.equal(Number(await value("SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user])),before);
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[p,'bc'.repeat(32)]),'aal2','service_role');
    assert.equal(await value("SELECT count(*)::integer FROM escrow_transactions WHERE auction_id=$1",[a]),1);
    const b=await auction();await sql("UPDATE auctions SET payment_mode='live' WHERE id=$1",[b]);
    await sql("UPDATE listings SET buy_it_now_price=10 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",[b]);
    const q=crypto.randomUUID();await sql("INSERT INTO payment_checkouts(id,user_id,mode,amount_minor,expires_at,auction_id) VALUES($1,$2,'live',1000,now()+interval '5 minutes',$3)",[q,user,b]);
    await as(user,()=>rejects(()=>value("SELECT set_live_payments(false)"),/Super admin/));
    await as(admin,()=>rejects(()=>value("SELECT set_live_payments(false)"),/Super admin/),'aal1');
    await as(admin,()=>value("SELECT set_live_payments(false)"));
    await as(user,()=>rejects(()=>value("SELECT buy_funded_auction($1,1000)",[b]),/paused/));
    await rejects(()=>bid(user,b,1000),/paused/);
    await rejects(()=>sql("INSERT INTO payment_checkouts(user_id,mode,amount_minor,expires_at) VALUES($1,'live',1,now()+interval '5 minutes')",[user]),/paused/);
    await as(user,()=>rejects(()=>value("SELECT request_withdrawal($1,'live',1,'ABA test','encrypted-test-value-placeholder-long-padding-long-padding',$2)",[crypto.randomUUID(),'42'.repeat(32)]),/paused/));
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[q,'bd'.repeat(32)]),'aal2','service_role');
    assert.equal(await value("SELECT purchased_order_id IS NULL FROM payment_checkouts WHERE id=$1",[q]),true);
    assert.match(await value("SELECT purchase_note FROM payment_checkouts WHERE id=$1",[q]),/wallet/);
    assert.equal(Number(await value("SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user])),before+1000);
    await as(admin,()=>value("SELECT set_live_payments(true)"));
    assert.equal((await as(admin,()=>value("SELECT withdrawal_balance_report()"))).issues.length,0);
    const c=await auction();await sql("UPDATE auctions SET payment_mode='live' WHERE id=$1",[c]);
    await sql("UPDATE listings SET buy_it_now_price=10 WHERE id=(SELECT listing_id FROM auctions WHERE id=$1)",[c]);
    const r=crypto.randomUUID();await sql("INSERT INTO payment_checkouts(id,user_id,mode,amount_minor,expires_at,auction_id) VALUES($1,$2,'live',1000,now()+interval '5 minutes',$3)",[r,user,c]);
    await sql("UPDATE auctions SET end_time=now()-interval '1 second' WHERE id=$1",[c]);
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[r,'be'.repeat(32)]),'aal2','service_role');
    assert.equal(await value("SELECT purchased_order_id IS NULL FROM payment_checkouts WHERE id=$1",[r]),true);
  });
  await t.test("QR bids reserve verified money once; stale bids retain the received funds",async()=>{
    const a=await auction();await sql("UPDATE auctions SET payment_mode='live' WHERE id=$1",[a]);
    const before=Number(await value("SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user]));
    const p=crypto.randomUUID();await sql("INSERT INTO payment_checkouts(id,user_id,mode,amount_minor,expires_at,bid_auction_id) VALUES($1,$2,'live',1000,now()+interval '5 minutes',$3)",[p,user,a]);
    await as(user,()=>rejects(()=>value("SELECT bid_verified_qr_internal($1,1000,$2)",[a,user]),/permission denied/));
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[p,'ce'.repeat(32)]),'aal2','service_role');
    const bidId=await value("SELECT submitted_bid_id FROM payment_checkouts WHERE id=$1",[p]);assert.ok(bidId);
    assert.equal(await value("SELECT winner_id FROM auctions WHERE id=$1",[a]),user);
    assert.equal(Number(await value("SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user])),before);
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[p,'ce'.repeat(32)]),'aal2','service_role');
    assert.equal(await value("SELECT count(*)::integer FROM bids WHERE auction_id=$1",[a]),1);
    await rejects(()=>sql("INSERT INTO payment_checkouts(user_id,mode,amount_minor,expires_at,bid_auction_id) VALUES($1,'live',1000,now()+interval '5 minutes',$2)",[seller,a]),/no longer valid/);
    const q=crypto.randomUUID();await sql("INSERT INTO payment_checkouts(id,user_id,mode,amount_minor,expires_at,bid_auction_id) VALUES($1,$2,'live',1100,now()+interval '5 minutes',$3)",[q,user,a]);
    await sql("SELECT wallet_move($1,'live',5000,0,'test_funding',null)",[other]);
    await bid(other,a,1200);
    const afterOutbid=Number(await value("SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user]));
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[q,'cf'.repeat(32)]),'aal2','service_role');
    assert.equal(await value("SELECT submitted_bid_id IS NULL FROM payment_checkouts WHERE id=$1",[q]),true);
    assert.equal(Number(await value("SELECT available FROM wallet_accounts WHERE user_id=$1 AND mode='live'",[user])),afterOutbid+1100);
    assert.match(await value("SELECT purchase_note FROM payment_checkouts WHERE id=$1",[q]),/wallet/);
    const restricted=crypto.randomUUID();
    await sql("INSERT INTO payment_checkouts(id,user_id,mode,amount_minor,expires_at,bid_auction_id) VALUES($1,$2,'live',1300,now()+interval '5 minutes',$3)",[restricted,user,a]);
    await sql("UPDATE profiles SET suspended=true WHERE id=$1",[user]);
    await as(user,()=>value("SELECT complete_checkout($1,$2)",[restricted,'da'.repeat(32)]),'aal2','service_role');
    assert.equal(await value("SELECT submitted_bid_id IS NULL FROM payment_checkouts WHERE id=$1",[restricted]),true);
    assert.equal(await value("SELECT status FROM payment_checkouts WHERE id=$1",[restricted]),'paid');
    await sql("UPDATE profiles SET suspended=false WHERE id=$1",[user]);
    assert.equal((await as(admin,()=>value("SELECT withdrawal_balance_report()"))).issues.length,0);
  });
  await t.test("upload isolation, path safety and MFA are enforced by storage RLS",async()=>{
    const insert=(name)=>sql("INSERT INTO storage.objects(bucket_id,name) VALUES('listing-images',$1)",[name]);
    await as(user,()=>insert(user+'/photo.jpg'));
    for(const name of [other+'/forged.jpg',user+'/../evil.jpg',user+'/payload.svg',user+'/bad\\name.jpg'])await as(user,()=>rejects(()=>insert(name),/row-level security/));
    await as(user,()=>rejects(()=>insert(user+'/aal1.jpg'),/row-level security/),'aal1');
    await as(user,()=>rejects(()=>sql("INSERT INTO storage.objects(bucket_id,name) VALUES('platform-assets','logos/payload.html')"),/row-level security/));
    await as(user,()=>rejects(()=>sql("UPDATE profiles SET display_name=$1 WHERE id=$2",['x'.repeat(101),user]),/profile_text_limits/));
    await as(admin,()=>rejects(()=>sql("UPDATE auctions SET end_time=now()"),/permission denied/));
    assert.equal(await value("SELECT count(*)::integer FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND NOT EXISTS(SELECT 1 FROM unnest(p.proconfig) v WHERE v LIKE 'search_path=%')"),0);
  });
  await t.test("billable API budgets are server-only and stop exactly at the limit",async()=>{
    await as(user,()=>rejects(()=>value("SELECT claim_api_action($1,'listing_analysis',2,3600)",[user]),/permission denied/));
    const claim=()=>as(user,()=>value("SELECT claim_api_action($1,'listing_analysis',2,3600)",[user]),'aal2','service_role');
    assert.equal(await claim(),true);assert.equal(await claim(),true);assert.equal(await claim(),false);
  });
  await t.test("public CMS refuses credential fields",async()=>{
    for(const key of ['api_key','GEMINI_API_KEY','SUPABASE_SERVICE_ROLE_KEY','password'])await as(admin,()=>rejects(()=>sql("INSERT INTO platform_settings(key,value) VALUES('accidental_secret',$1::jsonb)",[JSON.stringify({[key]:'not-a-real-key'})]),/private Integrations/));
    await as(admin,()=>sql("INSERT INTO platform_settings(key,value) VALUES('safe_public_test',$1::jsonb)",[JSON.stringify({heading:'Public content'})]));
  });
  await t.test(
    "policy publishing preserves acceptance history and gates new transactions",
    async () => {
      await as(user, () =>
        rejects(
          () =>
            sql(
              "SELECT publish_policy('privacy','demo-1.1','Privacy Policy',$1)",
              ["Updated privacy information. ".repeat(10)],
            ),
          /Super admin/,
        ),
      );
      await as(admin, () =>
        sql("SELECT publish_policy('privacy','demo-1.1','Privacy Policy',$1)", [
          "Updated privacy information. ".repeat(10),
        ]),
      );
      await as(user, () =>
        rejects(() => sql("SELECT require_eligible()"), /Accept the current/),
      );
      await as(user, () =>
        sql("SELECT accept_policies('demo-2.0','demo-1.1')"),
      );
      await as(user, () => sql("SELECT require_eligible()"));
      assert.equal(
        await value(
          "SELECT count(*)::integer FROM policy_acceptances WHERE user_id=$1 AND kind='privacy'",
          [user],
        ),
        2,
      );
      await as(admin, () =>
        rejects(
          () =>
            sql(
              "SELECT publish_policy('privacy','demo-1.1','Privacy Policy',$1)",
              ["Updated privacy information. ".repeat(10)],
            ),
          /new version/,
        ),
      );
    },
  );
});
