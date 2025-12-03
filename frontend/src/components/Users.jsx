import { useEffect, useState } from "react";
import { Button } from "./Button";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import API_URL from "../config";

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    axios
      .get(`${API_URL}/api/v1/user/bulk?filter=` + filter)
      .then((response) => {
        setUsers(response.data.user);
      });
  }, [filter]);

  return (
    <>
      <div className="mb-4">
        <input
          onChange={(e) => {
            setFilter(e.target.value);
          }}
          type="text"
          placeholder="Search by email..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No users found</p>
        ) : (
          users.map((user) => <User key={user._id} user={user} />)
        )}
      </div>
    </>
  );
};

function User({ user }) {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
      <div className="flex items-center">
        <div className="rounded-full h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-xl font-bold text-white mr-4">
          {user.firstName[0].toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-gray-800">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-gray-500">{user.username}</div>
        </div>
      </div>

      <Button
        onClick={() => {
          navigate("/send?id=" + user._id + "&name=" + user.firstName + "&email=" + user.username);
        }}
        label="Send Money"
      />
    </div>
  );
}

User.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.number.isRequired,
    firstName: PropTypes.string.isRequired,
    lastName: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
  }).isRequired,
};
