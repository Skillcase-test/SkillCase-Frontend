import { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { adminAccessApi } from "../api/adminAccessApi";

export const AdminAccessContext = createContext(null);

export function hasPermission(me, moduleKey, action = "view") {
  if (!me) return false;
  if (me.role === "super_admin") return true;
  const actions = me.permissions?.[moduleKey] || [];
  return actions.includes("manage") || actions.includes(action);
}

export function useAdminAccess(propMe = null) {
  const contextMe = useContext(AdminAccessContext);
  const reduxUser = useSelector((state) => state.auth?.user);
  const [fetchedMe, setFetchedMe] = useState(null);

  useEffect(() => {
    if (propMe?.permissions || contextMe?.permissions || reduxUser?.permissions) {
      return;
    }
    let mounted = true;
    adminAccessApi
      .getMyAccess()
      .then((res) => {
        if (mounted && res.data) {
          setFetchedMe(res.data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [propMe, contextMe, reduxUser]);

  return propMe || contextMe || fetchedMe || reduxUser || null;
}


