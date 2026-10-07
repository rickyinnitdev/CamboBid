-- ============================================================================
-- Migration 005: Publish Official Terms & Conditions (Version 1.0)
-- ============================================================================

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'terms',
  jsonb_build_object(
    'title', 'Terms & Conditions',
    'version', '1.0',
    'effective_date', 'October 7, 2026',
    'contact_email', 'support@cambobid.com',
    'published', true,
    'content', '1. Introduction & Agreement to Terms
Welcome to CamboBid. By registering an account, accessing, browsing, or using our platform, websites, or services (collectively, the "Platform"), you agree to be legally bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, you must not use or access the Platform.

2. Eligibility & Account Security
You must be at least 18 years of age and legally capable of entering into binding contracts to register an account or participate in auctions. You agree to provide accurate, current, and complete information during registration and to keep your credentials confidential. You are solely responsible for all activities that occur under your account. CamboBid reserves the right to require identity verification (Verified Bidder status) and Multi-Factor Authentication (MFA) prior to participating in high-value auctions.

3. Auction Participation & Binding Bids
All bids placed on CamboBid are irrevocable, legally binding contracts to purchase the listed item at the bid amount plus applicable platform fees. When you place a bid, you confirm your legal intent and financial capability to complete the purchase. Bidding can be placed manually or via our automated proxy bidding system. You may not retract, cancel, or reduce any bid once placed.

4. Dynamic Auction Timer & Anti-Sniping
To ensure fair and open competition, CamboBid enforces an anti-sniping extension rule: any bid placed within the final 180 seconds (3 minutes) of an active auction will automatically extend the remaining auction duration by 5 minutes. This process repeats until bidding concludes with no further bids within the final extension window.

5. Seller Obligations & Listing Integrity
Sellers are strictly responsible for the accuracy, condition, provenance, and authenticity of all listed items. Listings must accurately describe flaws, condition, and specifications, accompanied by genuine photographs. Sellers must hold unencumbered legal title to all listed items and agree to sell the item to the highest qualifying bidder once reserve price requirements (if any) are fulfilled.

6. Fees, Buyer''s Premium & Payment
Winning bidders are required to complete full payment within the designated checkout window following auction closure. A platform fee (standard 5% platform service fee or as explicitly stated on the auction listing) is added to the final hammer price. Winning bidders agree to pay the total purchase amount, including all applicable shipping fees, duties, and taxes.

7. Escrow Protection & Fund Release
To safeguard buyers and sellers, all payments for completed auctions are held securely in the CamboBid Escrow account. Escrow funds are not disbursed directly to the seller upon checkout. Funds are held until the buyer confirms safe delivery and item satisfaction, or until the standard escrow inspection period (24 hours following delivery confirmation) expires without an open dispute.

8. Shipping, Delivery & Inspection Window
Sellers must dispatch items using tracked, insured courier services within the agreed shipping timeframe following payment confirmation. Upon receiving the shipment, the buyer has a 48-hour inspection window to examine the item and verify that it matches the seller''s listing description and condition.

9. Dispute Resolution & Refunds
If an item is not received, is damaged in transit, or is materially different from the listing description, the buyer may file a dispute through the CamboBid Dispute Center within 48 hours of delivery. Both parties must submit relevant evidence (photos, tracking records, inspection reports). CamboBid dispute adjudicators will review the case and make a binding determination regarding full or partial escrow refunds or fund release to the seller.

10. Anti-Shill Bidding & Prohibited Conduct
CamboBid maintains a strict zero-tolerance policy against shill bidding, bid manipulation, and price artificial inflation. Sellers, their relatives, agents, and affiliates are strictly prohibited from bidding on their own listings. Users are prohibited from colluding to depress or inflate auction prices, circumventing the platform escrow, harassing other users, or listing counterfeit or illegal merchandise. Violations will result in immediate permanent account termination, forfeiture of deposits, and potential referral to law enforcement.

11. Disclaimer of Warranties & Limitation of Liability
The Platform and all auction listings are provided on an "as is" and "as available" basis. While CamboBid provides verified bidder systems and escrow protections, CamboBid does not manufacture, store, or physically warrant items sold by third-party sellers. To the maximum extent permitted by applicable law, CamboBid disclaims all warranties and shall not be liable for indirect, incidental, or consequential damages arising from marketplace transactions.

12. Termination & Account Suspension
CamboBid reserves the right to suspend, terminate, or restrict your access to any or all services at any time, with or without notice, if we believe you have breached these Terms, engaged in fraudulent or suspicious behavior, or posed a security risk to the community.

13. Governing Law, Modifications & Contact
CamboBid reserves the right to update these Terms at any time. Material changes will be posted on the Platform with an updated version number and effective date. Continued use of the Platform after revisions indicates acceptance of the amended Terms. For questions or legal notices, contact us at support@cambobid.com.'
  ),
  'Public Terms & Conditions document and registration consent version'
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
