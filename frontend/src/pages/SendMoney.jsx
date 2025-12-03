import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import API_URL from "../config";

export const SendMoney = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userToken = localStorage.getItem("token");

    if (!userToken) {
      navigate("/signin");
    }
  }, [navigate]);

  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  const [amount, setAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSendClick = () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setShowConfirm(true);
  };

  const confirmTransfer = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/account/transfer`,
        { to: id, amount },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      navigate("/paymentstatus?message=" + res?.data.message);
    } catch (error) {
      navigate("/paymentstatus?message=" + (error.response?.data?.message || "Transfer failed"));
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md">
            <h3 className="text-2xl font-bold mb-4">Confirm Transfer</h3>
            <p className="text-gray-600 mb-2">You are about to send:</p>
            <p className="text-3xl font-bold text-blue-600 mb-4">₹{parseFloat(amount).toFixed(2)}</p>
            <p className="text-gray-600 mb-6">To: {name} ({email})</p>
            <div className="flex gap-3">
              <button
                onClick={confirmTransfer}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          Send Money
        </h2>
        
        <div className="mb-8">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
              {name && name.length > 0 && name[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (₹)
          </label>
          <input
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            type="number"
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Enter amount"
            min="1"
          />
        </div>

        <button
          onClick={handleSendClick}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg mb-3"
        >
          Send Money
        </button>
        
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};