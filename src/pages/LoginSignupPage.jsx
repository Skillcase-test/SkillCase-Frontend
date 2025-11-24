import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, ArrowRight, BookOpen } from "lucide-react";
import { useDispatch } from "react-redux";
import {
  loginFailure,
  loginStart,
  loginSuccess,
} from "../redux/auth/authSlice";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const LoginSignupPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [number, setNumber] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const full_list = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (
      !number ||
      !password ||
      (!isLogin && (!username || !proficiencyLevel))
    ) {
      alert("Please fill in all required fields");
      return;
    }

    dispatch(loginStart());

    try {
      const endpoint = isLogin ? "/user/login" : "/user/signup";
      const payload = isLogin
        ? { number, password }
        : { number, username, password, proficiency_level: proficiencyLevel };

      const res = await api.post(endpoint, payload);

      dispatch(loginSuccess(res.data));
      alert(isLogin ? "Login successful!" : "Account created successfully!");
      setUsername("");
      setPassword("");
      setNumber("");
      setProficiencyLevel("");
      navigate("/");
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.msg || "Auth Failed"));
      alert(err.response?.data?.msg || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl sm:rounded-3xl shadow-xl mb-4">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-slate-800">SKILL</span>
            <span className="text-amber-400">CASE</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            A platform where you can learn, practice, and grow.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border border-slate-100">
          <div className="flex gap-2 mb-8 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                isLogin
                  ? "bg-white text-cyan-600 shadow-md"
                  : "text-slate-600 hover:text-slate-800 cursor-pointer"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                !isLogin
                  ? "bg-white text-cyan-600 shadow-md"
                  : "text-slate-600 hover:text-slate-800 cursor-pointer"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {isLogin ? "Welcome Back!" : "Create Account"}
              </h2>
              <p className="text-slate-600 text-sm">
                {isLogin
                  ? "Enter your credentials to continue"
                  : "Join us and start learning today"}
              </p>
            </div>

            {/* Mobile Number Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={number}
                  maxLength={10}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Enter your mobile number"
                  className="w-full pl-12 pr-4 py-3 sm:py-4 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Username (Signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-4 pr-4 py-3 sm:py-4 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 sm:py-4 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Proficiency Level (Signup only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Proficiency Level
                </label>
                <select
                  value={proficiencyLevel}
                  onChange={(e) => setProficiencyLevel(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 sm:py-4 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:outline-none transition-all text-slate-800"
                >
                  <option value="">Select a Proficiency Level</option>
                  {full_list.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Forgot Password (Login only) */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 sm:py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{isLogin ? "Login" : "Create Account"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Terms & Privacy (Signup only) */}
          {!isLogin && (
            <p className="mt-6 text-center text-xs text-slate-500">
              By signing up, you agree to our{" "}
              <a
                href="#"
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Privacy Policy
              </a>
            </p>
          )}
        </div>

        {/* Footer Message */}
        <div className="text-center mt-6 text-sm text-slate-600">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setIsLogin(false)}
                className="text-cyan-600 hover:text-cyan-700 cursor-pointer font-semibold transition-colors"
              >
                Sign up for free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsLogin(true)}
                className="text-cyan-600 hover:text-cyan-700 cursor-pointer font-semibold transition-colors"
              >
                Login here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSignupPage;
