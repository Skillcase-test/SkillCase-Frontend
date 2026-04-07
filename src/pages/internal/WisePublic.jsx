import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import WiseDashboard from "./WiseDashboard";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const SESSION_KEY = "wise_access_code";

function createWiseApi(accessCode) {
  return {
    get: (path, params = {}) => {
      const url = new URL(`${BACKEND_URL}${path}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      return fetch(url.toString(), {
        headers: { "x-wise-access-code": accessCode },
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");
        return data;
      });
    },
  };
}

export { createWiseApi };

export default function WisePublic() {
  const [accessCode, setAccessCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      verifyCode(stored, true);
    } else {
      setIsCheckingSession(false);
    }
  }, []);

  async function verifyCode(code, isSessionCheck = false) {
    if (!isSessionCheck) setIsLoading(true);
    setError("");
    try {
      const api = createWiseApi(code);
      await api.get("/wise/batches");
      sessionStorage.setItem(SESSION_KEY, code);
      setIsAuthenticated(true);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      if (!isSessionCheck) setError("Invalid access code");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      setIsCheckingSession(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    verifyCode(accessCode);
  }

  if (isCheckingSession) {
    return (
      <div style={styles.centeredPage}>
        <Loader2
          style={{
            width: 28,
            height: 28,
            color: "#163B72",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#6b7280", marginTop: 12, fontSize: 14 }}>
          Checking session...
        </p>
      </div>
    );
  }

  if (isAuthenticated) {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return <WiseDashboard accessCode={stored} />;
  }

  return (
    <div style={styles.centeredPage}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <ShieldCheck size={28} color="#163B72" />
        </div>
        <h1 style={styles.title}>Wise Dashboard</h1>
        <p style={styles.subtitle}>Enter access code to continue</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputWrap}>
            <input
              id="wise-access-code"
              type={showPassword ? "text" : "password"}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code"
              required
              disabled={isLoading}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            style={{ ...styles.submitBtn, opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? (
              <span style={styles.btnRow}>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Verifying...
              </span>
            ) : (
              "Access"
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  centeredPage: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#163B72",
    margin: "0 0 6px",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    margin: "0 0 24px",
  },
  inputWrap: {
    position: "relative",
    marginBottom: 12,
  },
  input: {
    width: "100%",
    padding: "11px 44px 11px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  error: {
    fontSize: 13,
    color: "#ef4444",
    marginBottom: 12,
    textAlign: "center",
  },
  submitBtn: {
    width: "100%",
    padding: "11px 0",
    backgroundColor: "#163B72",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  btnRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
};
