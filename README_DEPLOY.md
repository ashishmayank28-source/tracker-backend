# Deploy / Render connection notes

This file documents how to connect this repository to Render using the GitHub OAuth (recommended) so pushes and PRs auto-deploy like before.

Important: I cannot perform the OAuth connection from here. Follow the steps below in your Render account — it takes 2–3 minutes.

---

## 1) Connect Render to GitHub (OAuth)

1. Open Render dashboard: https://dashboard.render.com
2. Click `New` → `Web Service` (or open an existing service and click `Connect repository`).
3. When asked to select a repository provider, choose `GitHub` and click `Connect GitHub`.
4. A GitHub authorization dialog appears. Sign-in and authorize Render. Choose either:
   - `All repositories` (simple) or
   - `Only select repositories` and then select `ashishmayank28-source/tracker-backend`.
5. After authorization, in Render select the `tracker-backend` repository and the branch you want to auto-deploy (e.g., `main`).
6. Enable `Auto Deploy` (checkbox) so Render deploys on every push to the selected branch.

Notes:
- If you want PR preview deploys, enable **Pull Request Previews** in the Render service settings (if your plan supports it).
- No repo-level secrets are required when using OAuth; Render receives events via its GitHub App / webhook.

## 2) Where to find Service ID (if needed)

- In Render, open the service and look at the URL in the browser: it contains the service id, e.g.
  `https://dashboard.render.com/services/srv-xxxxxxxxxxxx` → `srv-xxxxxxxxxxxx` is the Service ID.
- You can also use the Render API (`GET /v1/services`) with an API key to list services.

## 3) If you previously relied on secrets

- I added a workflow job that triggers Render via the Render API using `RENDER_API_KEY` + `RENDER_SERVICE_ID`. If you connect via OAuth, you do not need those secrets and can safely keep or remove the workflow job.
- Current behavior:
  - If secrets are not set, the workflow prints `Render secrets not set; skipping deploy` and does not call the API.
  - If you prefer OAuth-only (recommended), you can:
    - Leave the workflow as-is (safe), or
    - I can remove the curl-based deploy step if you want the workflow to rely only on Render's GitHub App.

## 4) How to disable auto-deploy quickly

- On Render: open the service → `Settings` → uncheck `Auto Deploy` or disable Pull Request previews.
- On GitHub: Repo → `Settings` → `Webhooks` → find the Render webhook and delete it (if you want to stop external deploys immediately).

## 5) Test plan (quick)

1. Connect repo to Render via OAuth and enable Auto Deploy.
2. Create a small change on a branch, open a PR to `main` (or push to `main`).
3. On Render Dashboard → `Deploys` you should see a new deploy triggered with the commit sha and logs.
4. On GitHub Actions, the CI run will also appear; the workflow `deploy-render` will skip if secrets are not set (this is safe).

---

If you want, I can:
- Add a short commit that removes the curl-based `deploy-render` job from `.github/workflows/ci.yml` (so the repo only uses Render's OAuth integration), or
- Leave the workflow as-is (it will be skipped when secrets are absent).

Tell me if you want me to remove the API-based deploy job from the workflow and I will push that change.
