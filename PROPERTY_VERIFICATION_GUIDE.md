# Property Verification Guide

**Version:** DATA FOUNDATION 1.0

## Goal

Promote a listing from `seed` / `needs_verification` to `production` only when provenance is confirmed.

## Checklist

1. Source name identified and recorded  
2. Source URL or offline evidence stored (link or ops note)  
3. External listing ID captured when available  
4. Auction agency confirmed (or explicitly unknown)  
5. Auction date confirmed  
6. Location: at least suburb + town + province  
7. Street address: stored; display mode `full` or `suburb_only` if legally restricted  
8. Prices: only publish values present on source — never invent estimates  
9. Images: provider attribution or documented stock exception  
10. Set `last_verified_at = now()` and `data_classification = production`  
11. Recompute `data_quality_score`

## Who may verify

- Platform admin  
- Designated data ops role  

## What not to do

- Do not mark seed rows as production to “look complete”  
- Do not copy competitor portal text without licence  
- Do not geocode vaguely and claim survey-grade accuracy  

## UI expectations

- Seed → amber **Seed data** badge + provenance card  
- Unverified production candidate → missing `last_verified_at` explained  
- Missing agency → “Agency information not yet available.”
