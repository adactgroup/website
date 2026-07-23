# ADACT Viewer Usage Database Setup

The website integration, security rules and private dashboard are already included in this repository. Tracking remains disabled until the Firebase web configuration is added.

The supplied configuration automatically permits project tracking wherever the configured viewer runs. Set `consentRequired` to `true` in `js/firebase-config.js` to restore the project-usage notice.

## 1. Create the free Firebase project

1. Sign in to [Firebase Console](https://console.firebase.google.com/) using the Google account that should own ADACT's data.
2. Select **Create a project**.
3. Use a name such as `ADACT Viewer Usage`.
4. Google Analytics is not required for this database integration and may be left disabled.
5. Keep the project on the no-cost **Spark** plan.

## 2. Create the Sydney Firestore database

1. Open **Build > Firestore Database**.
2. Select **Create database**.
3. Choose **Production mode**.
4. Select `australia-southeast1 (Sydney)` as the database location.
5. Finish creating the database.

The database stores project metadata, the XML-declared software product and tool-event names only. XML/DXF contents, filenames, individual asset attributes and edited values remain in the browser.

## 3. Enable sign-in methods

Open **Build > Authentication > Sign-in method** and enable:

- **Anonymous** for public viewer submissions.
- **Google** for the private ADACT dashboard.

Under **Authentication > Settings > Authorised domains**, add:

- `adact.com.au`
- `www.adact.com.au`
- `127.0.0.1` while testing locally

The database rules currently authorise `projects@adact.com.au` as the dashboard administrator. If another Google account should be used, change the email in both:

- `firebase/firestore.rules`
- `js/firebase-config.js`

## 4. Register the website

1. Open **Project settings > General**.
2. Under **Your apps**, select the web icon (`</>`).
3. Use an app nickname such as `ADACT Website`.
4. Firebase Hosting is not required because the website remains on GitHub Pages.
5. Copy the displayed `firebaseConfig` values.
6. Add the four values to `js/firebase-config.js`:

```js
window.ADACT_FIREBASE_CONFIG = Object.freeze({
  apiKey: "provided-web-api-key",
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  appId: "provided-app-id",
  adminEmails: ["projects@adact.com.au"],
  trackingEnabled: true,
  consentVersion: "2026-07-23",
});
```

Firebase web configuration values identify the project but do not grant administrative access. Do not add service-account JSON, private keys or admin SDK credentials to this repository.

## 5. Publish the Firestore security rules

The rules are in `firebase/firestore.rules`. They provide:

- authenticated anonymous visitors: create-only access to tightly validated project and tool records;
- `projects@adact.com.au`: read and delete access;
- everyone else: no database access.

The simplest setup is to open **Firestore Database > Rules**, replace the editor contents with `firebase/firestore.rules`, then select **Publish**.

Alternatively, with the Firebase CLI:

```bash
firebase login
cp .firebaserc.example .firebaserc
firebase deploy --only firestore
```

Replace the example project ID in `.firebaserc` before deploying. Do not commit `.firebaserc` if it contains environment-specific configuration you do not want shared.

## 6. Test before publishing

1. Open the local ADAC Viewer and upload a valid non-sample XML.
2. Confirm the project usage notice appears.
3. Select **Allow project usage tracking**.
4. Use several viewer tools.
5. In Firestore, confirm new records appear under:
   - `project_uploads`
   - `tool_events`
6. Open `/usage-dashboard.html`.
7. Sign in with `projects@adact.com.au`.
8. Confirm the project and viewer-tool totals appear.
9. Test **Continue without sharing** in a private browser window and confirm no record is created.

## 7. Production checks

- Keep Firebase on the Spark plan unless the quota is intentionally upgraded.
- Enable multi-factor authentication on the Google account that owns Firebase.
- Review authorised domains and administrator emails regularly.
- Export the project register periodically because free-tier backup options are limited.
- Review old records and delete information that is no longer reasonably required.
- Update the privacy policy and consent version whenever collection purposes or fields change.
