import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../redux/auth/authSlice";
import api from "../api/axios";

const PHP_API = "https://skillcase.in";
const MAIN_SITE_LOGIN = "https://skillcase.in/login";

export function useSSO() {
  const [checking, setChecking] = useState(true);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSSO = async () => {
      if (isAuthenticated) {
        setChecking(false);
        return;
      }
      try {
        const phpRes = await fetch(`${PHP_API}/api/validate-session`, {
          credentials: "include",
        });
        
        // If not authenticated, redirect to main site login
        if (!phpRes.ok) {
          const returnUrl = encodeURIComponent(window.location.href);
          window.location.href = `${MAIN_SITE_LOGIN}?redirect=${returnUrl}`;
          return;
        }
        const phpData = await phpRes.json();
        if (!phpData.success) {
          const returnUrl = encodeURIComponent(window.location.href);
          window.location.href = `${MAIN_SITE_LOGIN}?redirect=${returnUrl}`;
          return;
        }
        
        // Step 2: Send user data to our backend to get JWT
        const backendRes = await api.post("/sso/create-token", {
          phone: phpData.user.phone,
          name: phpData.user.name,
          email: phpData.user.email,
        });
        if (backendRes.data.success) {
          dispatch(
            loginSuccess({
              token: backendRes.data.token,
              user: backendRes.data.user,
            })
          );
        }
      } catch (err) {
        console.log("SSO check failed:", err);
        // On error, also redirect to login
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${MAIN_SITE_LOGIN}?redirect=${returnUrl}`;
      } finally {
        setChecking(false);
      }
    };
    checkSSO();
  }, [isAuthenticated, dispatch]);
  return { checking };
}
