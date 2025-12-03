import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message");
  const navigate = useNavigate();
  const isSuccess = message?.toLowerCase().includes("success");

  useEffect(() => {
    const userToken = localStorage.getItem("token");

    if (!userToken) {
      navigate("/signin");
    } else {
      const t = setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [navigate]);

  return (
    <div className="flex justify-center items-center w-screen h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className={`${isSuccess ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-l-4 md:w-1/3 text-center py-10 px-8 m-4 rounded-2xl shadow-2xl`}>
        <div className="text-6xl mb-4">
          {isSuccess ? "✓" : "✗"}
        </div>
        <div className={`${isSuccess ? 'text-green-800' : 'text-red-800'} font-bold text-2xl mb-4`}>
          {message}
        </div>
        <div className="text-gray-600 text-sm font-semibold">
          Redirecting to Dashboard in 3 seconds...
        </div>
      </div>
    </div>
  );
};