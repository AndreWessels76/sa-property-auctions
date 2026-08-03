# SOURCE MAPPING — BIDDERS CHOICE

| Source field (HTML/CSV) | Property column |
|-------------------------|-----------------|
| Title / og:title | `title` |
| Address | `address` / `street_address` |
| Suburb | `suburb` |
| Town / City | `town` |
| Province | `province` |
| Postal code | `postal_code` |
| lat/lng | `latitude` / `longitude` |
| Property type | `property_type` |
| Beds/Baths/Garages | `bedrooms` / `bathrooms` / `garages` |
| Erf / floor size | `erf_size` / `floor_size` |
| Description | `description` |
| Images | property_images via `processImage` |
| Auction date/time/venue | `auction_date` / `auction_time` / `auction_venue` |
| Viewing / deposit | `viewing_information` / `deposit_requirements` |
| Terms / brochure / registration | `terms_link` / `brochure_link` / `registration_link` |
| Page URL | `source_url` |
| Derived slug id | `external_listing_id` (`bc_…`) |
| Agency | `auction_agency` = Bidders Choice |
| Content fingerprint | `source_content_hash` |

Absent fields remain `null` — never invented.
