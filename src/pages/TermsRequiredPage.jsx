import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { setUser } from "../redux/auth/authSlice";

const isValidPhone = (num) => {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(num);
};

const isValidEmail = (email) => {
  const regex = /^\S+@\S+\.\S+$/;
  return regex.test(email);
};

function TermsRequiredPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const [name, setName] = useState(user?.fullname || "");
  const [phoneNumber, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");

  const redirectTo = useMemo(() => {
    if (typeof location.state?.from === "string") {
      return location.state.from;
    }

    const fromQuery = new URLSearchParams(location.search).get("from");
    if (
      typeof fromQuery === "string" &&
      fromQuery.startsWith("/") &&
      !fromQuery.startsWith("//")
    ) {
      return fromQuery;
    }

    return "/";
  }, [location.state, location.search]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/profile");
        const profile = res.data?.profile || {};
        setName(profile.fullname || user?.fullname || "");
        setEmail(profile.email || "");
        const profileNumber = profile.number || "";
        setPhone(String(profileNumber).replace(/[^\d]/g, "").slice(-10));
      } catch (err) {
        setName(user?.fullname || "");
      }
    };

    fetchProfile();
  }, [user?.fullname]);

  const handleAgree = async () => {
    if (loading) {
      return;
    }

    setError("");
    setServerError("");

    if (!name || !isValidPhone(phoneNumber) || !isValidEmail(email) || !agree) {
      setError("Please fill all details correctly and agree to continue.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/user/accept-terms", {
        termsVersion: "v1",
        name,
        phoneNumber,
        email,
      });
      const me = await api.post("/user/me");
      dispatch(setUser(me.data.user));

      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error("Failed to accept terms:", err);
      setServerError("Could not save your acceptance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user && (!user.is_paid || user.terms_accepted)) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <img
                src="/mainlogo.png"
                alt="Logo"
                className="w-30 sm:w-30 md:w-30 lg:w-40 h-auto pt-1"
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 max-w-2xl mx-auto mt-6 bg-white shadow-lg rounded-2xl mb-10">
        <h1 className="text-2xl font-bold mb-4">
          STUDENT TRAINING AGREEMENT AND DECLARATION
        </h1>

        <div className="text-slate-700 text-[15px] leading-6 space-y-4">
          <p>
            This Student Training Agreement and Declaration (“Agreement”) is
            made between the enrolled candidate (“Student”) and Skillcase
            Education Private Limited (“Institution”). By signing this document,
            the Student acknowledges that they have fully read, understood, and
            agree to comply with all terms and conditions stated below.
          </p>

          <h2 className="font-bold text-lg mt-4">
            1. Course Duration and Learning Progress
          </h2>
          <p>
            The time required to complete each language level (A1 to B2) depends
            on the Student&apos;s individual learning capacity, consistency, and
            personal effort. The Institution does not guarantee completion of
            any level within a fixed duration, as progress may vary.
          </p>

          <h2 className="font-bold text-lg mt-4">
            2. Attendance and Participation
          </h2>
          <p>
            Regular attendance and active participation are mandatory. The
            Institution reserves the right to restrict or discontinue class
            access due to prolonged absenteeism, misconduct, or
            non-participation, without refund or compensation.
          </p>

          <h2 className="font-bold text-lg mt-4">
            3. Fees, Refunds, and Cancellation
          </h2>
          <p>
            All fees paid are{" "}
            <span className="font-bold">
              non-refundable and non-transferable
            </span>
            , except under the limited condition stated below.
          </p>
          <p>
            A refund will be provided{" "}
            <span className="font-bold">
              only if the Student requests it within the first 15 days from the
              commencement of their classes
            </span>
            .
          </p>
          <p>No refund shall be provided in cases of:</p>
          <ul className="list-disc ml-5">
            <li>
              Requests made after the first 15 days of class commencement.
            </li>
            <li>Partial attendance or missed classes.</li>
            <li>Voluntary withdrawal for personal reasons.</li>
            <li>Absenteeism.</li>
            <li>Removal due to disciplinary issues.</li>
            <li>Technical issues on the Student&apos;s end.</li>
          </ul>
          <p>
            If the Institution cancels the course entirely, a full refund will
            be issued.
          </p>

          <h2 className="font-bold text-lg mt-4">
            4. Code of Conduct and Discipline
          </h2>
          <p>
            The Student must maintain respectful communication and professional
            conduct in all sessions. Any form of disruptive, abusive, or
            inappropriate behavior may result in suspension or termination from
            the program without refund.
          </p>

          <h2 className="font-bold text-lg mt-4">5. Technical Requirements</h2>
          <p>
            The Student is responsible for ensuring stable internet access, a
            functioning device, and the ability to attend online classes. Missed
            sessions due to personal technical issues will not be rescheduled or
            compensated.
          </p>

          <h2 className="font-bold text-lg mt-4">
            6. Intellectual Property and Content Usage
          </h2>
          <p>
            All course materials, class recordings, documents, and resources are
            the property of the Institution and are provided solely for the
            Student&apos;s personal learning. Copying, sharing, distributing, or
            commercial use of such materials is strictly prohibited.
          </p>

          <h2 className="font-bold text-lg mt-4">
            7. Assessments and Certification
          </h2>
          <p>
            Periodic assessments may be conducted. Certificates of completion or
            progress will be issued at the discretion of the Institution, based
            on attendance, performance, assessment results, and internal
            evaluation criteria.
          </p>

          <h2 className="font-bold text-lg mt-4">
            8. Job Placement Assistance (Clarification Clause)
          </h2>
          <p>Skillcase Education Private Limited provides Students with:</p>
          <ul className="list-disc ml-5">
            <li>Job matching assistance</li>
            <li>Interview preparation</li>
            <li>Documentation guidance</li>
            <li>Coordination with prospective employers</li>
          </ul>

          <p>However, final employment outcomes depend on:</p>
          <ul className="list-disc ml-5">
            <li>The Student&apos;s German language proficiency</li>
            <li>Interview performance</li>
            <li>Employer selection criteria</li>
            <li>Documentation compliance</li>
          </ul>

          <p className="font-semibold">
            No guarantee of job placement, employment offer, visa issuance, or
            migration approval is provided.
          </p>

          <h2 className="font-bold text-lg mt-4">
            9. Learning Outcome Responsibility
          </h2>
          <p>
            The Institution will provide structured teaching and guidance. Final
            proficiency depends on the Student&apos;s personal practice,
            consistency, and independent effort.
          </p>

          <h2 className="font-bold text-lg mt-4">
            10. Limitation of Liability
          </h2>
          <p>
            The Institution shall not be liable for direct, indirect, or
            consequential losses, including employment expectations, financial
            decisions, travel plans, or migration outcomes. The Student
            participates voluntarily and accepts full responsibility for
            personal progress and decisions.
          </p>

          <h2 className="font-bold text-lg mt-4">11. Privacy and Data Use</h2>
          <p>
            Personal information collected will be used only for academic,
            administrative, and support purposes. The Institution will not share
            personal data with external parties without consent, except where
            required by law.
          </p>

          <h2 className="font-bold text-lg mt-4">12. Binding Effect</h2>
          <p>
            By signing this Agreement, the Student confirms they have read,
            understood, and agree to be bound by this Agreement. This document
            is legally valid and enforceable.
          </p>

          <h2 className="font-bold text-lg mt-6">STUDENT DECLARATION</h2>
          <p>
            I hereby declare that I have read, understood, and agree to the
            above terms and conditions.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Full Name*"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Phone Number*"
            value={phoneNumber}
            maxLength={10}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
          />

          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Email*"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
            />
            <span className="text-sm">I agree to all the terms above.</span>
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {phoneNumber && !isValidPhone(phoneNumber) && (
            <p className="text-red-600 text-sm">
              Enter a valid Indian phone number.
            </p>
          )}
          {email && !isValidEmail(email) && (
            <p className="text-red-600 text-sm">
              Please enter a valid email address.
            </p>
          )}
          {serverError && <p className="text-red-600 text-sm">{serverError}</p>}

          <button
            disabled={
              !name ||
              !isValidPhone(phoneNumber) ||
              !isValidEmail(email) ||
              !agree ||
              loading
            }
            className={`w-full p-3 rounded-lg text-white font-semibold ${
              name &&
              isValidPhone(phoneNumber) &&
              agree &&
              isValidEmail(email) &&
              !loading
                ? "bg-[#EDB843] hover:bg-[#edaf2b] transition-colors duration-200 cursor-pointer"
                : "bg-[#eeca7e] cursor-not-allowed"
            }`}
            onClick={handleAgree}
          >
            <p className="text-[#163B72] text-md font-bold">
              {loading ? "Submitting..." : "Agree & Continue"}
            </p>
          </button>
        </div>
      </div>

      <footer className="bg-[#153A71] text-white py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-12">
            <div>
              <h3 className="text-3xl font-bold mb-6">About us</h3>
              <p className="text-white text-base leading-relaxed">
                Empowering professionals for global careers. We simplify
                international recruitment through expert guidance, language
                training, and end-to-end relocation support.
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold mb-6">Contact Us</h3>
              <div className="space-y-4 text-base">
                <p className="text-white">Phone: +91 97314 62667</p>
                <p className="text-white">Email: info@skillcase.in</p>
                <p className="text-white">
                  Hours: Mon - Sat | 10:00 AM – 8:00 PM
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-bold mb-6">Quick Links</h3>
              <ul className="space-y-3 text-base">
                <li>
                  <a href="#about" className="text-white hover:underline">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-white hover:underline">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="text-white hover:underline">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#blog" className="text-white hover:underline">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-900 pt-8">
            <p className="text-base text-white">
              © 2025 Skillcase All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default TermsRequiredPage;
