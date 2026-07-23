# ADACT Viewer Weekly Usage Report Setup

The repository includes a scheduled report workflow at `.github/workflows/weekly-usage-report.yml`.

It runs at 8:00 am every Monday in Brisbane and emails a weekly summary to `projects@adact.com.au`. The email includes headline statistics, week-over-week comparisons, software, receiver, schema and tool breakdowns, up to 25 detailed project records, and a CSV attachment containing every upload in the period.

Project details are never written to GitHub Actions logs or uploaded as workflow artifacts.

## 1. Create a read-only Google service account

1. Open the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=adact-viewer).
2. Select **Create service account**.
3. Name it `ADACT Weekly Usage Report`.
4. Grant only **Cloud Datastore Viewer** (`roles/datastore.viewer`).
5. Open the new service account.
6. Open **Keys > Add key > Create new key > JSON**.
7. Download the JSON key once.

Treat the JSON key as a password. Never add it to the repository, website files, email or chat. Rotate or delete the key if it is exposed.

## 2. Add the Firebase credential to GitHub

1. Open the website repository on GitHub.
2. Open **Settings > Secrets and variables > Actions**.
3. Under **Repository secrets**, create:
   - Name: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Value: the complete contents of the downloaded JSON key
4. Delete the downloaded key from the computer after confirming the workflow works.

## 3. Configure Resend

1. Create a free account at [Resend](https://resend.com/).
2. Add and verify `adact.com.au` under **Domains**.
3. Add the DNS records Resend supplies without changing the website's existing records.
4. Create a sending API key.
5. In the GitHub repository's **Repository secrets**, create:
   - Name: `RESEND_API_KEY`
   - Value: the Resend API key

The default sender is `ADACT Viewer <reports@adact.com.au>`. The mailbox does not need to exist, but the `adact.com.au` sending domain must be verified by Resend.

## 4. Optional report settings

Under **Settings > Secrets and variables > Actions > Variables**, the following repository variables can override the defaults:

- `WEEKLY_REPORT_TO` - defaults to `projects@adact.com.au`
- `WEEKLY_REPORT_FROM` - defaults to `ADACT Viewer <reports@adact.com.au>`

These are ordinary configuration values, not secrets.

## 5. Test before the first scheduled run

1. Open **Actions > Weekly ADAC Viewer usage report**.
2. Select **Run workflow**.
3. Leave **Send the report email** unticked for the first run.
4. Confirm the workflow succeeds. This tests the Firebase credential and report query without sending an email.
5. Run it again with **Send the report email** ticked.
6. Confirm the message and CSV attachment arrive at `projects@adact.com.au`.

The scheduled workflow sends automatically after the two secrets are configured. Manual runs default to a dry run so an accidental click does not email project information.

## Security notes

- The service account is read-only and cannot modify or delete Firestore records.
- GitHub Actions secrets are not available to website visitors or included in the deployed site.
- The report does not create public artifacts.
- Report emails contain project and professional information and should only be sent to authorised ADACT recipients.
- Rotate the Google service-account key and Resend API key periodically.
