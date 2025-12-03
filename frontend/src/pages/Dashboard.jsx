import { useEffect, useState } from "react";
import { Appbar } from "../components/Appbar";
import { Balance } from "../components/Balance";
import { Users } from "../components/Users";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API_URL from "../config";

export const Dashboard = () => {
  const [bal, setBal] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("7days");
  const navigate = useNavigate();
  const { notifications } = useSocket();

  useEffect(() => {
    const userToken = localStorage.getItem("token");

    if (!userToken) {
      navigate("/signin");
      return;
    }

    // Fetch user balance
    axios
      .get(`${API_URL}/api/v1/account/balance`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })
      .then((response) => {
        setBal(parseFloat(response.data.balance) || 0);
      })
      .catch((error) => {
        console.error("Error fetching balance:", error);
        navigate("/signin");
      });

    // Fetch transaction history
    const fetchTransactions = async (params = {}) => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/account/history`, {
          headers: { Authorization: `Bearer ${userToken}` },
          params,
        });
        setTransactions(response.data.transactions || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      }
    };

    fetchTransactions();
  }, [navigate]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      const userToken = localStorage.getItem("token");
      if (!userToken) return;
      try {
        const response = await axios.get(`${API_URL}/api/v1/account/analytics`, {
          headers: { Authorization: `Bearer ${userToken}` },
          params: { period: analyticsPeriod }
        });
        setAnalyticsData(response.data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      }
    };
    fetchAnalytics();
  }, [analyticsPeriod]);

  // apply filters
  const applyFilters = async () => {
    const userToken = localStorage.getItem("token");
    const params = {};
    if (filterType && filterType !== "all") params.type = filterType;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    if (minAmount) params.minAmount = minAmount;
    if (maxAmount) params.maxAmount = maxAmount;

    try {
      const response = await axios.get(`${API_URL}/api/v1/account/history`, {
        headers: { Authorization: `Bearer ${userToken}` },
        params,
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error("Error fetching filtered transactions:", err);
    }
  };

  const exportCSV = async () => {
    const userToken = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_URL}/api/v1/account/export`, {
        headers: { Authorization: `Bearer ${userToken}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transactions.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Appbar />
      
      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map((notif, idx) => (
          <div key={idx} className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in">
            <p className="font-semibold">{notif.message}</p>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <Balance value={bal} />
        </div>

        {/* Analytics Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Spending Analytics</h2>
            <select 
              value={analyticsPeriod} 
              onChange={(e) => setAnalyticsPeriod(e.target.value)}
              className="border px-3 py-2 rounded-lg"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="12months">Last 12 Months</option>
            </select>
          </div>

          {analyticsData && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-red-600">₹{analyticsData.summary.totalSent.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Received</p>
                  <p className="text-2xl font-bold text-green-600">₹{analyticsData.summary.totalReceived.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded-lg ${analyticsData.summary.netFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                  <p className="text-sm text-gray-600">Net Flow</p>
                  <p className={`text-2xl font-bold ${analyticsData.summary.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    ₹{analyticsData.summary.netFlow.toFixed(2)}
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#ef4444" name="Sent" />
                  <Line type="monotone" dataKey="received" stroke="#10b981" name="Received" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">{/* existing grid content */}
          {/* Send Money Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Send Money</h2>
            <Users />
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Transactions</h2>
              <div className="flex gap-2 items-center mb-4">
                <select value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="border px-2 py-1 rounded">
                  <option value="all">All</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
                <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="border px-2 py-1 rounded" />
                <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="border px-2 py-1 rounded" />
                <input type="number" placeholder="Min" value={minAmount} onChange={e=>setMinAmount(e.target.value)} className="border px-2 py-1 rounded w-20" />
                <input type="number" placeholder="Max" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} className="border px-2 py-1 rounded w-20" />
                <button onClick={applyFilters} className="ml-auto bg-blue-500 text-white px-3 py-1 rounded">Apply</button>
                <button onClick={exportCSV} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Export CSV</button>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      txn.type === "credit"
                        ? "bg-green-50 border-green-500"
                        : "bg-red-50 border-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {txn.type === "credit" ? "Received from" : "Sent to"}
                        </p>
                        <p className="text-sm text-gray-600">{txn.otherParty}</p>
                        <p className="text-xs text-gray-500">{txn.otherPartyEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(txn.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            txn.type === "credit" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                        </p>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
