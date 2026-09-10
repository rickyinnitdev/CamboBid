-- ============================================================================
-- AUPTION PLATFORM — SEED DATA
-- Roles, permissions, role-permission mappings, categories, default translations
-- ============================================================================

-- ============================================================================
-- 1. ROLES
-- ============================================================================

INSERT INTO public.roles (name, description, is_system) VALUES
  ('super_admin', 'Full platform access. Bypasses all restrictions.', TRUE),
  ('auctioneer', 'Manages auctions, listings, and categories.', TRUE),
  ('verified_bidder', 'Verified user who can place bids.', TRUE),
  ('casual_visitor', 'Default role for new unverified users.', TRUE),
  ('escrow_manager', 'Manages escrow transactions and fund releases.', TRUE);

-- ============================================================================
-- 2. PERMISSIONS
-- ============================================================================

-- Users
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('users.read', 'users', 'read', 'View user profiles'),
  ('users.update', 'users', 'update', 'Update user profiles'),
  ('users.suspend', 'users', 'suspend', 'Suspend/unsuspend users'),
  ('users.verify_identity', 'users', 'verify_identity', 'Verify user identity documents');

-- Roles & Permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('roles.manage', 'roles', 'manage', 'Create, update, delete roles'),
  ('permissions.manage', 'permissions', 'manage', 'Assign/revoke permissions');

-- Listings
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('listings.read', 'listings', 'read', 'View listings'),
  ('listings.create', 'listings', 'create', 'Create new listings'),
  ('listings.update', 'listings', 'update', 'Update listings'),
  ('listings.delete', 'listings', 'delete', 'Delete listings'),
  ('listings.approve', 'listings', 'approve', 'Approve or reject listings');

-- Auctions
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('auctions.read', 'auctions', 'read', 'View auctions'),
  ('auctions.create', 'auctions', 'create', 'Create new auctions'),
  ('auctions.update', 'auctions', 'update', 'Update auction settings'),
  ('auctions.close', 'auctions', 'close', 'Close auctions early');

-- Bids
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('bids.create', 'bids', 'create', 'Place bids on auctions'),
  ('bids.read', 'bids', 'read', 'View bid history'),
  ('bids.retract', 'bids', 'retract', 'Retract bids');

-- Escrow
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('escrow.read', 'escrow', 'read', 'View escrow transactions'),
  ('escrow.release', 'escrow', 'release', 'Release escrow funds to seller'),
  ('escrow.refund', 'escrow', 'refund', 'Refund escrow to buyer'),
  ('escrow.freeze', 'escrow', 'freeze', 'Freeze escrow during disputes');

-- Disputes
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('disputes.read', 'disputes', 'read', 'View disputes'),
  ('disputes.file', 'disputes', 'file', 'File new disputes'),
  ('disputes.manage', 'disputes', 'manage', 'Review, resolve, and arbitrate disputes');

-- Activity Logs
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('logs.read', 'logs', 'read', 'View activity logs'),
  ('logs.export', 'logs', 'export', 'Export activity logs to CSV');

-- CMS Translations
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('cms.read', 'cms', 'read', 'View CMS translations'),
  ('cms.manage', 'cms', 'manage', 'Create, update, delete CMS translations');

-- Analytics
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('analytics.read', 'analytics', 'read', 'View analytics dashboard'),
  ('analytics.export', 'analytics', 'export', 'Export analytics reports');

-- Categories
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('categories.read', 'categories', 'read', 'View categories'),
  ('categories.manage', 'categories', 'manage', 'Create, update, delete categories');

-- Notifications
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('notifications.read', 'notifications', 'read', 'View notifications'),
  ('notifications.manage', 'notifications', 'manage', 'Manage notification settings');

-- Orders
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('orders.read', 'orders', 'read', 'View orders'),
  ('orders.manage', 'orders', 'manage', 'Manage order status and delivery');

-- ============================================================================
-- 3. ROLE-PERMISSION MAPPINGS
-- ============================================================================

-- Super Admin: ALL permissions (insert all)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'super_admin';

-- Auctioneer permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'auctioneer'
  AND p.name IN (
    'users.read',
    'listings.read', 'listings.create', 'listings.update', 'listings.approve',
    'auctions.read', 'auctions.create', 'auctions.update', 'auctions.close',
    'bids.read',
    'categories.read', 'categories.manage',
    'cms.read', 'cms.manage',
    'logs.read',
    'analytics.read',
    'notifications.read',
    'disputes.read', 'disputes.manage'
  );

-- Verified Bidder permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'verified_bidder'
  AND p.name IN (
    'listings.read', 'listings.create', 'listings.update',
    'auctions.read',
    'bids.create', 'bids.read', 'bids.retract',
    'orders.read',
    'disputes.read', 'disputes.file',
    'notifications.read'
  );

-- Casual Visitor permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'casual_visitor'
  AND p.name IN (
    'listings.read',
    'auctions.read',
    'categories.read'
  );

-- Escrow Manager permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'escrow_manager'
  AND p.name IN (
    'users.read',
    'bids.read',
    'escrow.read', 'escrow.release', 'escrow.refund', 'escrow.freeze',
    'orders.read', 'orders.manage',
    'logs.read',
    'analytics.read',
    'notifications.read',
    'disputes.read', 'disputes.manage'
  );

-- ============================================================================
-- 4. CATEGORIES
-- ============================================================================

INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('Watches & Timepieces', 'watches', 'Luxury and collectible watches', 1),
  ('Jewelry', 'jewelry', 'Fine jewelry and gemstones', 2),
  ('Art', 'art', 'Paintings, sculptures, and digital art', 3),
  ('Antiques', 'antiques', 'Antique furniture, decor, and artifacts', 4),
  ('Electronics', 'electronics', 'Consumer electronics and gadgets', 5),
  ('Vehicles', 'vehicles', 'Cars, motorcycles, and other vehicles', 6),
  ('Collectibles', 'collectibles', 'Coins, stamps, memorabilia, and trading cards', 7),
  ('Real Estate', 'real-estate', 'Properties and land', 8),
  ('Fashion', 'fashion', 'Designer clothing, bags, and accessories', 9),
  ('Home & Garden', 'home-garden', 'Furniture, decor, and garden equipment', 10),
  ('Sports & Outdoors', 'sports-outdoors', 'Sports equipment and outdoor gear', 11),
  ('Books & Media', 'books-media', 'Rare books, vinyl records, and media', 12);

-- Subcategories for Watches
INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Luxury Watches', 'luxury-watches', (SELECT id FROM public.categories WHERE slug = 'watches'), 1),
  ('Vintage Watches', 'vintage-watches', (SELECT id FROM public.categories WHERE slug = 'watches'), 2),
  ('Smartwatches', 'smartwatches', (SELECT id FROM public.categories WHERE slug = 'watches'), 3);

-- Subcategories for Jewelry
INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Rings', 'rings', (SELECT id FROM public.categories WHERE slug = 'jewelry'), 1),
  ('Necklaces', 'necklaces', (SELECT id FROM public.categories WHERE slug = 'jewelry'), 2),
  ('Bracelets', 'bracelets', (SELECT id FROM public.categories WHERE slug = 'jewelry'), 3);

-- Subcategories for Art
INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Paintings', 'paintings', (SELECT id FROM public.categories WHERE slug = 'art'), 1),
  ('Sculptures', 'sculptures', (SELECT id FROM public.categories WHERE slug = 'art'), 2),
  ('Digital Art', 'digital-art', (SELECT id FROM public.categories WHERE slug = 'art'), 3),
  ('Photography', 'photography', (SELECT id FROM public.categories WHERE slug = 'art'), 4);

-- Subcategories for Electronics
INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Computers', 'computers', (SELECT id FROM public.categories WHERE slug = 'electronics'), 1),
  ('Mobile Devices', 'mobile-devices', (SELECT id FROM public.categories WHERE slug = 'electronics'), 2),
  ('Audio Equipment', 'audio-equipment', (SELECT id FROM public.categories WHERE slug = 'electronics'), 3),
  ('Cameras', 'cameras', (SELECT id FROM public.categories WHERE slug = 'electronics'), 4);

-- ============================================================================
-- 5. PLATFORM SETTINGS
-- ============================================================================

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('brand', '{"name":"BidHaus","tagline":"Curated auctions for rare finds","trust_score":"Excellent","review_count":"140,724","review_source":"Trustpilot","primary_cta":"Explore auctions","secondary_cta":"Start selling"}'::jsonb, 'Public brand and trust banner copy'),
  ('homepage', '{"hero_eyebrow":"Live this week","hero_title":"Bid on extraordinary objects, verified by experts","hero_subtitle":"Discover watches, art, jewellery, interiors and collectibles in timed auctions with secure escrow and real-time bidding.","hero_promo":"New bidder credit for every verified winner","featured_title":"Ending soon","category_title":"Explore specialist auctions","trust_title":"Auction-grade protection from bid to delivery"}'::jsonb, 'Homepage editorial and merchandising content'),
  ('auction_rules', '{"platform_fee":5,"min_bid_increment":1,"max_auction_duration_hours":168,"auto_extend_minutes":5,"extension_threshold_seconds":180,"dispute_window_hours":48,"escrow_release_hours":24,"min_deposit":50}'::jsonb, 'Default auction and escrow business rules'),
  ('auth', '{"email_confirm_required":true,"google_login_enabled":true,"user_mfa_required":false,"admin_mfa_required":true,"verified_bidder_mfa_required":false}'::jsonb, 'Frontend authentication and security defaults');

-- ============================================================================
-- 6. DEFAULT CMS TRANSLATIONS (English)
-- ============================================================================

INSERT INTO public.cms_translations (locale, key, value) VALUES
  -- Navigation
  ('en', 'nav.home', 'Home'),
  ('en', 'nav.auctions', 'Auctions'),
  ('en', 'nav.categories', 'Categories'),
  ('en', 'nav.how_it_works', 'How It Works'),
  ('en', 'nav.sell', 'Sell'),
  ('en', 'nav.login', 'Login'),
  ('en', 'nav.register', 'Register'),
  ('en', 'nav.profile', 'My Profile'),
  ('en', 'nav.my_listings', 'My Listings'),
  ('en', 'nav.my_bids', 'My Bids'),
  ('en', 'nav.my_orders', 'My Orders'),
  ('en', 'nav.my_disputes', 'My Disputes'),
  ('en', 'nav.notifications', 'Notifications'),
  ('en', 'nav.logout', 'Logout'),
  ('en', 'nav.admin', 'Admin Panel'),

  -- Homepage
  ('en', 'home.hero_title', 'Discover. Bid. Win.'),
  ('en', 'home.hero_subtitle', 'The premium online auction platform for discerning collectors and sellers.'),
  ('en', 'home.browse_auctions', 'Browse Auctions'),
  ('en', 'home.start_selling', 'Start Selling'),
  ('en', 'home.featured_auctions', 'Featured Auctions'),
  ('en', 'home.how_it_works_title', 'How It Works'),
  ('en', 'home.step1_title', 'Register & Verify'),
  ('en', 'home.step1_desc', 'Create an account and verify your identity to start bidding.'),
  ('en', 'home.step2_title', 'Browse & Bid'),
  ('en', 'home.step2_desc', 'Explore live auctions and place your bids with confidence.'),
  ('en', 'home.step3_title', 'Win & Collect'),
  ('en', 'home.step3_desc', 'Win auctions and enjoy secure escrow-protected transactions.'),

  -- Auction
  ('en', 'auction.current_price', 'Current Price'),
  ('en', 'auction.starting_price', 'Starting Price'),
  ('en', 'auction.place_bid', 'Place Bid'),
  ('en', 'auction.proxy_bid', 'Proxy Bid'),
  ('en', 'auction.proxy_bid_max', 'Maximum Proxy Amount'),
  ('en', 'auction.buy_it_now', 'Buy It Now'),
  ('en', 'auction.time_remaining', 'Time Remaining'),
  ('en', 'auction.ended', 'Auction Ended'),
  ('en', 'auction.upcoming', 'Upcoming'),
  ('en', 'auction.live', 'LIVE'),
  ('en', 'auction.extended', 'Extended'),
  ('en', 'auction.bid_history', 'Bid History'),
  ('en', 'auction.no_bids', 'No bids yet. Be the first!'),
  ('en', 'auction.you_are_highest', 'You are the highest bidder!'),
  ('en', 'auction.outbid_alert', 'You have been outbid!'),
  ('en', 'auction.reserve_met', 'Reserve price met'),
  ('en', 'auction.reserve_not_met', 'Reserve price not yet met'),
  ('en', 'auction.winner', 'Winner'),
  ('en', 'auction.sold_for', 'Sold for'),

  -- Bid
  ('en', 'bid.success', 'Bid placed successfully!'),
  ('en', 'bid.error.insufficient', 'Your bid is too low. Please bid at least the minimum increment.'),
  ('en', 'bid.error.proxy_max', 'Proxy maximum must be higher than your bid.'),
  ('en', 'bid.error.suspended', 'Your account has been suspended. You cannot place bids.'),
  ('en', 'bid.error.verified', 'You must verify your identity to place bids.'),
  ('en', 'bid.error.own_item', 'You cannot bid on your own item.'),
  ('en', 'bid.error.ended', 'This auction has ended.'),
  ('en', 'bid.error.rate_limit', 'Too many bids. Please wait a moment.'),
  ('en', 'bid.error.shill_detected', 'This bid has been flagged for review.'),
  ('en', 'bid.placed_at', 'Placed at'),

  -- Listing
  ('en', 'listing.create', 'Create Listing'),
  ('en', 'listing.edit', 'Edit Listing'),
  ('en', 'listing.title', 'Title'),
  ('en', 'listing.description', 'Description'),
  ('en', 'listing.category', 'Category'),
  ('en', 'listing.condition', 'Condition'),
  ('en', 'listing.images', 'Images'),
  ('en', 'listing.starting_price', 'Starting Price'),
  ('en', 'listing.reserve_price', 'Reserve Price'),
  ('en', 'listing.buy_it_now_price', 'Buy It Now Price'),
  ('en', 'listing.submit', 'Submit for Approval'),
  ('en', 'listing.approve', 'Approve'),
  ('en', 'listing.reject', 'Reject'),
  ('en', 'listing.status.draft', 'Draft'),
  ('en', 'listing.status.pending', 'Pending Approval'),
  ('en', 'listing.status.approved', 'Approved'),
  ('en', 'listing.status.rejected', 'Rejected'),
  ('en', 'listing.status.live', 'Live'),
  ('en', 'listing.status.sold', 'Sold'),
  ('en', 'listing.condition.new', 'New'),
  ('en', 'listing.condition.like_new', 'Like New'),
  ('en', 'listing.condition.excellent', 'Excellent'),
  ('en', 'listing.condition.good', 'Good'),
  ('en', 'listing.condition.fair', 'Fair'),
  ('en', 'listing.condition.poor', 'Poor'),

  -- Profile
  ('en', 'profile.title', 'My Profile'),
  ('en', 'profile.display_name', 'Display Name'),
  ('en', 'profile.email', 'Email'),
  ('en', 'profile.phone', 'Phone'),
  ('en', 'profile.bio', 'Bio'),
  ('en', 'profile.location', 'Location'),
  ('en', 'profile.reputation', 'Reputation Score'),
  ('en', 'profile.identity_status', 'Identity Verification'),
  ('en', 'profile.verified', 'Verified'),
  ('en', 'profile.pending', 'Pending Verification'),
  ('en', 'profile.not_verified', 'Not Verified'),
  ('en', 'profile.suspended', 'Suspended'),
  ('en', 'profile.deposit_paid', 'Deposit Paid'),
  ('en', 'profile.bid_limit', 'Bid Limit'),
  ('en', 'profile.upload_id', 'Upload ID Document'),
  ('en', 'profile.save', 'Save Changes'),

  -- Orders
  ('en', 'order.title', 'My Orders'),
  ('en', 'order.detail', 'Order Details'),
  ('en', 'order.status', 'Status'),
  ('en', 'order.amount', 'Amount'),
  ('en', 'order.payment_status', 'Payment Status'),
  ('en', 'order.confirm_delivery', 'Confirm Delivery'),
  ('en', 'order.awaiting_shipment', 'Awaiting Shipment'),
  ('en', 'order.shipped', 'Shipped'),
  ('en', 'order.delivered', 'Delivered'),
  ('en', 'order.escrow_released', 'Funds Released'),
  ('en', 'order.dispute_filed', 'Dispute Filed'),

  -- Disputes
  ('en', 'dispute.file', 'File Dispute'),
  ('en', 'dispute.reason', 'Reason'),
  ('en', 'dispute.description', 'Description'),
  ('en', 'dispute.evidence', 'Evidence'),
  ('en', 'dispute.submit', 'Submit Dispute'),
  ('en', 'dispute.status.open', 'Open'),
  ('en', 'dispute.status.under_review', 'Under Review'),
  ('en', 'dispute.status.resolved', 'Resolved'),
  ('en', 'dispute.status.appealed', 'Appealed'),
  ('en', 'dispute.status.closed', 'Closed'),
  ('en', 'dispute.add_evidence', 'Add Evidence'),
  ('en', 'dispute.appeal_deadline', 'Appeal Deadline'),

  -- Escrow
  ('en', 'escrow.title', 'Escrow Management'),
  ('en', 'escrow.status', 'Escrow Status'),
  ('en', 'escrow.amount', 'Amount'),
  ('en', 'escrow.release', 'Release Funds'),
  ('en', 'escrow.refund', 'Refund Buyer'),
  ('en', 'escrow.freeze', 'Freeze Transaction'),
  ('en', 'escrow.pending', 'Pending Payment'),
  ('en', 'escrow.held', 'Funds Held'),
  ('en', 'escrow.released', 'Funds Released'),
  ('en', 'escrow.frozen', 'Transaction Frozen'),
  ('en', 'escrow.refunded', 'Funds Refunded'),

  -- Admin
  ('en', 'admin.dashboard', 'Dashboard'),
  ('en', 'admin.users', 'Users'),
  ('en', 'admin.bidders', 'Bidders'),
  ('en', 'admin.roles', 'Roles & Permissions'),
  ('en', 'admin.listings', 'Listings'),
  ('en', 'admin.listings_queue', 'Approval Queue'),
  ('en', 'admin.auctions', 'Auctions'),
  ('en', 'admin.escrow', 'Escrow'),
  ('en', 'admin.disputes', 'Disputes'),
  ('en', 'admin.logs', 'Activity Logs'),
  ('en', 'admin.analytics', 'Analytics'),
  ('en', 'admin.cms', 'CMS Translations'),
  ('en', 'admin.categories', 'Categories'),
  ('en', 'admin.settings', 'Settings'),
  ('en', 'admin.export_csv', 'Export CSV'),
  ('en', 'admin.export_pdf', 'Export PDF'),
  ('en', 'admin.approve', 'Approve'),
  ('en', 'admin.reject', 'Reject'),
  ('en', 'admin.verify', 'Verify'),
  ('en', 'admin.suspend', 'Suspend'),
  ('en', 'admin.unsuspend', 'Unsuspend'),

  -- Notifications
  ('en', 'notification.outbid', 'You have been outbid on'),
  ('en', 'notification.won_auction', 'Congratulations! You won the auction for'),
  ('en', 'notification.auction_ending', 'Auction ending soon:'),
  ('en', 'notification.dispute_filed', 'A dispute has been filed for'),
  ('en', 'notification.escrow_released', 'Escrow funds have been released for'),
  ('en', 'notification.listing_approved', 'Your listing has been approved:'),
  ('en', 'notification.listing_rejected', 'Your listing has been rejected:'),

  -- Errors
  ('en', 'errors.unauthorized', 'You are not authorized to perform this action.'),
  ('en', 'errors.not_found', 'The requested resource was not found.'),
  ('en', 'errors.server_error', 'An unexpected error occurred. Please try again.'),
  ('en', 'errors.validation_error', 'Please check your input and try again.'),
  ('en', 'errors.network_error', 'Network error. Please check your connection.'),
  ('en', 'errors.file_too_large', 'File is too large. Maximum size is 10MB.'),
  ('en', 'errors.invalid_file_type', 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'),

  -- Common
  ('en', 'common.loading', 'Loading...'),
  ('en', 'common.save', 'Save'),
  ('en', 'common.cancel', 'Cancel'),
  ('en', 'common.delete', 'Delete'),
  ('en', 'common.edit', 'Edit'),
  ('en', 'common.view', 'View'),
  ('en', 'common.search', 'Search'),
  ('en', 'common.filter', 'Filter'),
  ('en', 'common.sort', 'Sort'),
  ('en', 'common.submit', 'Submit'),
  ('en', 'common.confirm', 'Confirm'),
  ('en', 'common.back', 'Back'),
  ('en', 'common.next', 'Next'),
  ('en', 'common.previous', 'Previous'),
  ('en', 'common.no_data', 'No data found'),
  ('en', 'common.retry', 'Retry'),
  ('en', 'common.close', 'Close'),
  ('en', 'common.add', 'Add'),
  ('en', 'common.remove', 'Remove'),
  ('en', 'common.yes', 'Yes'),
  ('en', 'common.no', 'No'),
  ('en', 'common.of', 'of'),
  ('en', 'common.page', 'Page'),
  ('en', 'common.results', 'results'),
  ('en', 'common.all', 'All'),
  ('en', 'common.active', 'Active'),
  ('en', 'common.inactive', 'Inactive'),

  -- Calendar
  ('en', 'calendar.upcoming_auctions', 'Upcoming Auctions'),
  ('en', 'calendar.month', 'Month'),
  ('en', 'calendar.week', 'Week'),
  ('en', 'calendar.day', 'Day'),

  -- Analytics
  ('en', 'analytics.bid_to_close', 'Bid-to-Close Conversion Rate'),
  ('en', 'analytics.hammer_price', 'Hammer Price vs Estimated Price'),
  ('en', 'analytics.seller_success', 'Seller Success Rate'),
  ('en', 'analytics.bidder_engagement', 'Bidder Engagement Frequency'),
  ('en', 'analytics.revenue', 'Platform Commission Revenue'),
  ('en', 'analytics.category_performance', 'Category Performance'),
  ('en', 'analytics.date_range', 'Date Range'),
  ('en', 'analytics.total_auctions', 'Total Auctions'),
  ('en', 'analytics.active_auctions', 'Active Auctions'),
  ('en', 'analytics.gmv', 'Gross Merchandise Value'),
  ('en', 'analytics.platform_revenue', 'Platform Revenue'),
  ('en', 'analytics.active_bidders', 'Active Bidders'),
  ('en', 'analytics.dispute_rate', 'Dispute Rate'),

  -- Search
  ('en', 'search.title', 'Search Results'),
  ('en', 'search.no_results', 'No results found for'),
  ('en', 'search.try_different', 'Try different keywords or filters'),
  ('en', 'search.results_for', 'Results for'),

  -- Language
  ('en', 'language.en', 'English'),
  ('en', 'language.km', 'Khmer');

-- ============================================================================
-- 6. DEFAULT CMS TRANSLATIONS (Khmer)
-- ============================================================================

INSERT INTO public.cms_translations (locale, key, value) VALUES
  ('km', 'nav.home', '\u1791\u17B6\u1789\u1789\u17D2\u179A\u179F\u17CB\u1794\u17D2\u178A\u1784'),
  ('km', 'nav.auctions', '\u1780\u17B6\u1789\u1789\u17D2\u179A\u1794\u17D2\u178A\u1784'),
  ('km', 'nav.categories', '\u1785\u179B\u17D2\u179A\u179F\u17CB\u1789\u17D2\u179A\u179F\u17CB'),
  ('km', 'nav.login', '\u1785\u1791\u17D2\u179A\u17B8\u179F\u17CD'),
  ('km', 'nav.register', '\u1785\u17D2\u179A\u179B\u1780\u179F\u17CD'),
  ('km', 'nav.profile', '\u1794\u17D2\u178F\u17D2\u178F\u1784\u1794\u1789\u17D2\u1799\u17C0\u178E'),
  ('km', 'nav.logout', '\u1785\u1787\u17D2\u179A\u179F\u17CD'),
  ('km', 'home.hero_title', '\u1795\u17D2\u178F\u17D2\u179A\u1780\u17CB \u1780\u17B6\u1789\u1789\u17D2\u179A\u1794\u17D2\u178A\u1784 \u1789\u1798\u17D2\u179A\u1780'),
  ('km', 'home.hero_subtitle', '\u1785\u1798\u17D2\u179B\u1790\u17D2\u1784\u1784\u17D2\u179A\u1794\u17D2\u178A\u1784 \u1787\u17B6\u1789\u1789\u17D2\u179A\u1794\u17D2\u178A\u1784 \u1787\u1798\u17D2\u179A\u179B\u17C0\u1793\u17D2\u178F\u1784\u1794\u1787\u17B6\u1789\u17D2\u1794\u1787\u17D2\u1793'),
  ('km', 'home.browse_auctions', '\u1785\u17B6\u1789\u1789\u17D2\u179A\u1794\u17D2\u178A\u1784\u1780\u17B6\u1789\u1789\u17D2\u179A\u1794\u17D2\u178A\u1784'),
  ('km', 'common.loading', '\u1780\u17C6\u17D2\u1793\u1793\u17CB...'),
  ('km', 'common.save', '\u1795\u17D2\u178F\u17D2\u179A\u1780'),
  ('km', 'common.cancel', '\u1785\u1787\u17D2\u179A\u179F\u17CD'),
  ('km', 'common.delete', '\u1785\u1798\u17D2\u1794\u17D2\u178F'),
  ('km', 'common.edit', '\u1785\u17D2\u179A\u179B\u1794\u17D2\u178F'),
  ('km', 'common.search', '\u1795\u17D2\u178F\u179A\u1780\u17CB'),
  ('km', 'common.submit', '\u1795\u17D2\u178F\u17D2\u179A\u1780\u17CB');

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
