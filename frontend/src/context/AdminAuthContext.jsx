import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const AdminAuthContext = createContext();

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('admin_access_token'));
  const [adminUser, setAdminUser] = useState(() => {
    const token = sessionStorage.getItem('admin_access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { user_id: payload.user_id, email: payload.sub, role: payload.role };
    } catch { return null; }
  });

  const adminLogin = useCallback(async (email, password) => {
    const res = await axios.post('http://127.0.0.1:8000/admin/login', { email, password });
    const { access_token, admin_name } = res.data;
    sessionStorage.setItem('admin_access_token', access_token);
    setAdminToken(access_token);
    const payload = JSON.parse(atob(access_token.split('.')[1]));
    setAdminUser({ user_id: payload.user_id, email: payload.sub, role: payload.role, name: admin_name });
    return res.data;
  }, []);

  const adminLogout = useCallback(() => {
    sessionStorage.removeItem('admin_access_token');
    setAdminToken(null);
    setAdminUser(null);
  }, []);

  const isAdminAuthenticated = !!adminToken && !!adminUser && adminUser.role === 'ADMIN';

  return (
    <AdminAuthContext.Provider value={{ adminToken, adminUser, adminLogin, adminLogout, isAdminAuthenticated }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
