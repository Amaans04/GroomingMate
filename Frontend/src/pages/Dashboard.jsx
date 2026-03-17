import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          You are logged in{user?.username ? ` as ${user.username}` : ""}.
        </p>
        <button
          onClick={logout}
          className="mt-6 w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

