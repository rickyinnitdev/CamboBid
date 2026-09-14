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
-- 7. DEMO TEST USERS
-- Password for every seeded auth user: Test1234!
-- ============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"CamboBid Admin"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'auctioneer@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Auction Ops"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'escrow@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Escrow Manager"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller1@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Future Finds Studio"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller2@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Phnom Penh Vault"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bidder1@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Maya Proxy Bidder"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bidder2@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Dara Live Bidder"}', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'visitor@cambobid.test', crypt('Test1234!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"display_name":"Casual Visitor"}', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

INSERT INTO public.profiles (
  id, role, display_name, email, identity_verified, reputation_score, bid_limit,
  deposit_paid, bio, location
) VALUES
  ('10000000-0000-0000-0000-000000000001', 'super_admin', 'CamboBid Admin', 'admin@cambobid.test', TRUE, 99.50, 100, TRUE, 'Platform owner account for full admin testing.', 'Phnom Penh'),
  ('10000000-0000-0000-0000-000000000002', 'auctioneer', 'Auction Ops', 'auctioneer@cambobid.test', TRUE, 96.00, 80, TRUE, 'Approves listings, manages auctions, and reviews AI risk flags.', 'Phnom Penh'),
  ('10000000-0000-0000-0000-000000000003', 'escrow_manager', 'Escrow Manager', 'escrow@cambobid.test', TRUE, 94.00, 60, TRUE, 'Tests escrow release, refund, freeze, and dispute workflows.', 'Siem Reap'),
  ('10000000-0000-0000-0000-000000000004', 'verified_bidder', 'Future Finds Studio', 'seller1@cambobid.test', TRUE, 91.30, 40, TRUE, 'Seller test account for premium tech and creator-owned lots.', 'Phnom Penh'),
  ('10000000-0000-0000-0000-000000000005', 'verified_bidder', 'Phnom Penh Vault', 'seller2@cambobid.test', TRUE, 89.80, 40, TRUE, 'Seller test account for collectibles, jewelry, art, and rare goods.', 'Battambang'),
  ('10000000-0000-0000-0000-000000000006', 'verified_bidder', 'Maya Proxy Bidder', 'bidder1@cambobid.test', TRUE, 87.20, 30, TRUE, 'Tests proxy bidding and high-value auction participation.', 'Kampot'),
  ('10000000-0000-0000-0000-000000000007', 'verified_bidder', 'Dara Live Bidder', 'bidder2@cambobid.test', TRUE, 82.40, 30, TRUE, 'Tests live bidding, outbid notifications, and disputes.', 'Siem Reap'),
  ('10000000-0000-0000-0000-000000000008', 'casual_visitor', 'Casual Visitor', 'visitor@cambobid.test', FALSE, 10.00, 5, FALSE, 'Unverified visitor for access-control testing.', 'Phnom Penh')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  identity_verified = EXCLUDED.identity_verified,
  reputation_score = EXCLUDED.reputation_score,
  bid_limit = EXCLUDED.bid_limit,
  deposit_paid = EXCLUDED.deposit_paid,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  updated_at = NOW();

-- ============================================================================
-- 8. DEMO MARKETPLACE DATA: 5 ITEMS PER TOP-LEVEL CATEGORY
-- Uses direct online image URLs instead of Supabase Storage uploads.
-- ============================================================================

WITH demo_categories AS (
  SELECT id, name, slug, row_number() OVER (ORDER BY sort_order) AS category_rank
  FROM public.categories
  WHERE parent_id IS NULL
), demo_items AS (
  SELECT
    c.id AS category_id,
    c.slug,
    c.name AS category_name,
    item_no,
    CASE item_no
      WHEN 1 THEN 'AI-authenticated signature piece'
      WHEN 2 THEN 'smart provenance collector lot'
      WHEN 3 THEN 'limited prototype drop'
      WHEN 4 THEN 'heritage restoration showcase'
      ELSE 'creator-curated vault bundle'
    END AS concept,
    (120 + c.category_rank * 65 + item_no * 37)::numeric(12,2) AS starting_price,
    CASE WHEN item_no IN (1, 3) THEN 'excellent'::public.condition_type WHEN item_no = 2 THEN 'like_new'::public.condition_type ELSE 'good'::public.condition_type END AS condition
  FROM demo_categories c
  CROSS JOIN generate_series(1, 5) AS item_no
), inserted_listings AS (
  INSERT INTO public.listings (
    seller_id, title, description, category_id, condition, images,
    starting_price, reserve_price, buy_it_now_price, status, approved_by,
    approved_at, view_count, created_at, updated_at
  )
  SELECT
    CASE WHEN item_no % 2 = 0 THEN '10000000-0000-0000-0000-000000000004'::uuid ELSE '10000000-0000-0000-0000-000000000005'::uuid END,
    '[Demo] ' || category_name || ' - ' || concept,
    'Innovation-focused ' || lower(category_name) || ' auction lot with AI-ready metadata, online image URL, provenance notes, and buyer confidence signals for demo testing.',
    category_id,
    condition,
    jsonb_build_array(jsonb_build_object(
      'url', 'https://source.unsplash.com/1200x900/?' || replace(slug, '-', ',') || ',auction,' || item_no,
      'name', slug || '-demo-' || item_no || '.jpg',
      'path', 'external/' || slug || '-' || item_no || '.jpg'
    )),
    starting_price,
    starting_price * 1.35,
    starting_price * 2.25,
    CASE WHEN item_no = 5 THEN 'sold'::public.listing_status ELSE 'approved'::public.listing_status END,
    '10000000-0000-0000-0000-000000000002'::uuid,
    NOW() - INTERVAL '2 days',
    25 + item_no * 13,
    NOW() - (item_no || ' days')::interval,
    NOW()
  FROM demo_items di
  WHERE NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.title = '[Demo] ' || di.category_name || ' - ' || di.concept
  )
  RETURNING id, title, seller_id, starting_price
), all_demo_listings AS (
  SELECT id, title, seller_id, starting_price, row_number() OVER (ORDER BY title) AS rn
  FROM public.listings
  WHERE title LIKE '[Demo] %'
), inserted_auctions AS (
  INSERT INTO public.auctions (
    listing_id, type, status, start_time, end_time, original_end_time,
    current_price, bid_increment, bid_increment_percent, reserve_met,
    winner_id, closed_by, closure_reason, created_at, updated_at
  )
  SELECT
    l.id,
    CASE WHEN rn % 11 = 0 THEN 'sealed'::public.auction_type WHEN rn % 7 = 0 THEN 'dutch'::public.auction_type ELSE 'english'::public.auction_type END,
    CASE WHEN rn % 5 = 0 THEN 'closed'::public.auction_status WHEN rn % 4 = 0 THEN 'scheduled'::public.auction_status WHEN rn % 3 = 0 THEN 'extended'::public.auction_status ELSE 'live'::public.auction_status END,
    CASE WHEN rn % 5 = 0 THEN NOW() - INTERVAL '2 days' WHEN rn % 4 = 0 THEN NOW() + INTERVAL '1 day' ELSE NOW() - INTERVAL '2 hours' END,
    CASE WHEN rn % 5 = 0 THEN NOW() - INTERVAL '1 hour' WHEN rn % 4 = 0 THEN NOW() + INTERVAL '3 days' ELSE NOW() + ((rn % 6 + 1) || ' hours')::interval END,
    CASE WHEN rn % 5 = 0 THEN NOW() - INTERVAL '1 hour' WHEN rn % 4 = 0 THEN NOW() + INTERVAL '3 days' ELSE NOW() + ((rn % 6 + 1) || ' hours')::interval END,
    l.starting_price + (rn % 9) * 18,
    CASE WHEN l.starting_price < 500 THEN 10 ELSE 25 END,
    NULL,
    rn % 2 = 0,
    CASE WHEN rn % 5 = 0 THEN '10000000-0000-0000-0000-000000000006'::uuid ELSE NULL END,
    CASE WHEN rn % 5 = 0 THEN '10000000-0000-0000-0000-000000000002'::uuid ELSE NULL END,
    CASE WHEN rn % 5 = 0 THEN 'Demo auction closed for completed-order testing' ELSE NULL END,
    NOW() - INTERVAL '1 day',
    NOW()
  FROM all_demo_listings l
  WHERE NOT EXISTS (SELECT 1 FROM public.auctions a WHERE a.listing_id = l.id)
  RETURNING id, listing_id, status, current_price
), demo_auctions AS (
  SELECT a.id, a.listing_id, a.status, a.current_price, l.seller_id, row_number() OVER (ORDER BY l.title) AS rn
  FROM public.auctions a
  JOIN public.listings l ON l.id = a.listing_id
  WHERE l.title LIKE '[Demo] %'
), demo_bids AS (
  INSERT INTO public.bids (auction_id, bidder_id, amount, proxy_max_amount, is_proxy, status, placed_at, ip_address, user_agent, device_fingerprint)
  SELECT id, '10000000-0000-0000-0000-000000000006'::uuid, current_price + 10, current_price + 120, TRUE,
    CASE WHEN status = 'closed' THEN 'winning'::public.bid_status ELSE 'active'::public.bid_status END,
    NOW() - INTERVAL '50 minutes', '203.0.113.21'::inet, 'CamboBid demo browser', 'demo-maya-proxy'
  FROM demo_auctions da
  WHERE da.status IN ('live', 'extended', 'closed')
    AND da.seller_id <> '10000000-0000-0000-0000-000000000006'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.bids b WHERE b.auction_id = da.id AND b.bidder_id = '10000000-0000-0000-0000-000000000006'::uuid)
  UNION ALL
  SELECT id, '10000000-0000-0000-0000-000000000007'::uuid, current_price + 25, NULL, FALSE,
    CASE WHEN status = 'closed' THEN 'outbid'::public.bid_status ELSE 'active'::public.bid_status END,
    NOW() - INTERVAL '35 minutes', '203.0.113.22'::inet, 'CamboBid demo browser', 'demo-dara-live'
  FROM demo_auctions da
  WHERE da.status IN ('live', 'extended', 'closed')
    AND da.seller_id <> '10000000-0000-0000-0000-000000000007'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.bids b WHERE b.auction_id = da.id AND b.bidder_id = '10000000-0000-0000-0000-000000000007'::uuid)
  RETURNING auction_id, bidder_id
), closed_demo AS (
  SELECT * FROM demo_auctions WHERE status = 'closed' LIMIT 8
), demo_escrow AS (
  INSERT INTO public.escrow_transactions (auction_id, buyer_id, seller_id, amount, status, released_by, notes)
  SELECT id, '10000000-0000-0000-0000-000000000006'::uuid, seller_id, current_price,
    CASE WHEN rn % 2 = 0 THEN 'held'::public.escrow_status ELSE 'pending'::public.escrow_status END,
    NULL,
    'Demo escrow transaction for testing payment, release, refund, and freeze controls.'
  FROM closed_demo cd
  WHERE seller_id <> '10000000-0000-0000-0000-000000000006'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.escrow_transactions e WHERE e.auction_id = cd.id)
  RETURNING auction_id
), dispute_source AS (
  SELECT * FROM closed_demo WHERE rn % 2 = 1 LIMIT 3
), demo_disputes AS (
  INSERT INTO public.disputes (auction_id, filer_id, respondent_id, reason, description, evidence, status, arbitrator_id, appeal_deadline)
  SELECT id, '10000000-0000-0000-0000-000000000007'::uuid, seller_id,
    'Item condition mismatch',
    'Demo dispute: buyer says AI analysis predicted excellent condition but received condition needs manual review.',
    jsonb_build_array(jsonb_build_object('url', 'https://source.unsplash.com/1200x900/?auction,evidence', 'name', 'demo-evidence.jpg')),
    'open'::public.dispute_status,
    '10000000-0000-0000-0000-000000000002'::uuid,
    NOW() + INTERVAL '7 days'
  FROM dispute_source ds
  WHERE seller_id <> '10000000-0000-0000-0000-000000000007'::uuid
    AND NOT EXISTS (SELECT 1 FROM public.disputes d WHERE d.auction_id = ds.id)
  RETURNING auction_id
)
INSERT INTO public.notifications (user_id, type, title, body, auction_id)
SELECT '10000000-0000-0000-0000-000000000006'::uuid, 'demo_bid', 'Demo proxy bids are ready', 'Use this account to test proxy bidding and winning flows.', id FROM demo_auctions WHERE status IN ('live', 'extended') LIMIT 10
ON CONFLICT DO NOTHING;

INSERT INTO public.activity_logs (actor_id, action, resource_type, metadata)
VALUES
  ('10000000-0000-0000-0000-000000000002', 'demo_seed_loaded', 'seed', '{"scope":"users,listings,auctions,bids,escrow,disputes","note":"Rich demo data loaded for testing."}'::jsonb),
  ('10000000-0000-0000-0000-000000000001', 'automation_feature_ready', 'ai_listing_analysis', '{"provider":"gemini","status":"migration_and_edge_function_available"}'::jsonb);

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
