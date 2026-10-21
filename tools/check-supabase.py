
"""Verify public Supabase setup without signing in or changing user records."""
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

settings = json.loads(Path("config/public.json").read_text())
base = settings["supabaseUrl"].rstrip("/")
key = settings["supabasePublishableKey"]
if urlparse(base).scheme != "https" or not key.startswith("sb_publishable_"):
    raise SystemExit("Use an HTTPS project URL and a publishable browser key.")

def request(path, body=None):
    headers = {"apikey": key}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = Request(base + path, data=body, headers=headers)
    try:
        with urlopen(req, timeout=20) as response:
            return response.status, response.read()
    except HTTPError as error:
        return error.code, error.read()
    except URLError:
        raise SystemExit("Supabase could not be reached. Check that the project is running.")

status, payload = request("/auth/v1/settings")
if status != 200:
    raise SystemExit("The project URL or publishable key was not accepted, or the project is paused.")
print("PASS: Supabase accepts the public project configuration.")

for path, body in [
    ("/rest/v1/lab_progress?select=exercise_id&limit=0", None),
    ("/rest/v1/rpc/save_lab_progress", b"{}"),
]:
    status, payload = request(path, body)
    try:
        code = json.loads(payload).get("code", "")
    except (ValueError, AttributeError):
        code = ""
    if status == 404:
        raise SystemExit("Database setup is missing. Run supabase/migrations/20261021_lab_progress.sql in the project's SQL Editor, then rerun this job.")
    if status not in (401, 403) or code != "42501":
        raise SystemExit("Expected anonymous permission denial for " + path.split("?")[0] + ". Observed HTTP " + str(status) + " code " + str(code) + ". Review the database migration.")
print("PASS: anonymous access to the progress table and save function is denied.")
print("Live email/password sign-in and two-account acceptance tests still require provisioned lab accounts.")
