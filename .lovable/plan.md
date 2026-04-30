I checked the backend data and the issue is clear now:

- The representation page visits are being recorded in the existing visitor log. That is why you can see them in notifications.
- The new representation visitor table is still empty, so the Staff → Submissions → Representation Requests tracker has nothing to display.
- The current tracker also only tries to record after the position or DOB step, not when someone first lands on the page.
- It uses a different browser visitor ID from the existing site visitor tracking, so even if it did write later, it would not reliably connect to the same person you see in notifications.
- The popup form fields themselves are not currently updating the visitor tracker, so someone can enter DOB/position in the form and submit successfully without the tracking panel ever seeing those in-progress details.

Plan to fix it properly:

1. Use the existing visitor log as the base source for representation tracking
   - The tracker panel will show everyone who enters `/representation` and the translated representation routes.
   - This means the bare minimum will show immediately: city, country and IP-derived location from the already-working visitor tracking.
   - It will no longer depend on the separate representation visitor table having a row before showing a visitor.

2. Link representation details to the same visitor ID
   - Update the representation detail tracker to use the same `visitor_id` key as the normal site visitor tracker.
   - This allows page-entry location and later DOB/position details to merge into one staff row.

3. Track on page entry, not just after details
   - Add a lightweight page-entry tracking call on the representation page mount.
   - The Staff tracker will display visitors even before they click anything.

4. Track DOB and position everywhere they can be entered
   - Keep tracking when the cinematic position picker and DOB picker are used.
   - Also track when DOB or position is typed/changed inside the Request Representation popup form.
   - Only DOB, position, age group and language will be stored in this visitor tracker. Names, phone numbers and emails will stay in the actual submitted request only.

5. Make the backend tracking function more reliable
   - Change it from “insert only unless the browser remembers a row ID” to “update the latest row for this visitor ID, otherwise insert”.
   - This prevents missed updates when session storage is cleared or the user reloads.
   - Add proper city/country/IP location handling only through the backend, using the same approach that already works for the notification visitor log.

6. Improve the Staff UI
   - The collapsed “Visitor Tracking” section will show:
     - when they entered the representation page
     - city
     - country
     - IP-derived country/location
     - position
     - date of birth
     - calculated age
     - language
     - last updated time
   - If there are representation page visitors but no DOB/position yet, it will still show the visitor with those fields as blank rather than saying “No visitor entries yet”.

7. Verify after implementation
   - Check the backend rows for recent representation page visits.
   - Open the staff section and confirm the UK visit appears before any form submission.
   - Enter DOB/position and confirm the same row updates.
   - Submit the form and confirm the actual request still appears as before.

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>