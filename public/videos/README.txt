# Purpose: Document where optional service explainer videos belong and how they are named.
Service explainer videos
========================
Drop your videos in this folder with these exact names and they play on the matching page automatically:

  webdevelopment.mp4   ->  /Webdevelopment
  seo.mp4              ->  /SEO
  design.mp4           ->  /Design
  branding.mp4         ->  /Branding
  marketing.mp4        ->  /Marketing

Until a file exists, the page shows an "Explainer video coming soon" frame.
Optional: set a poster image per service in src/pages/Services/servicesData.js ("poster" field).
To use a different file name, change the "video" field of that service in the same file.
Tip: use MP4 (H.264) so it plays in every browser.
