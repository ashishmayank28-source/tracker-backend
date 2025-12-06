import { useState, useEffect } from "react";
import { useAuth } from "../auth.jsx";

export default function Profile() {
  const { API_BASE, token, user, setAuth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user?.empCode) return;
    setLoading(true);
    fetch(`${API_BASE}/api/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch((e) => setErr("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user?.empCode]);

  if (loading) return <p>Loading profile...</p>;
  if (!profile) return <p>No profile data</p>;

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const body = {
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile,
        courierAddress: profile.courierAddress,
      };

      const res = await fetch(`${API_BASE}/api/users/${profile.empCode}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Save failed");

      setProfile(data.user || data);
      // update local user cached in auth if name/email changed
      const newUser = { ...user, name: data.user?.name || body.name, email: data.user?.email || body.email };
      setAuth(token, newUser);
    } catch (err) {
      setErr(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">My Profile</h2>
      <form onSubmit={onSave} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Employee Code</label>
          <input className="mt-1 w-full border rounded px-3 py-2 bg-gray-100" value={profile.empCode} readOnly />
        </div>

        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={profile.name || ""}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2"
            value={profile.email || ""}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Mobile</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={profile.mobile || ""}
            onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Courier Address</label>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2"
            value={profile.courierAddress || ""}
            onChange={(e) => setProfile({ ...profile, courierAddress: e.target.value })}
          />
        </div>

        {err && <p className="text-red-500">{err}</p>}

        <div className="flex space-x-2">
          <button disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
