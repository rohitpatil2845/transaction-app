import PropTypes from 'prop-types';

export const Balance = ({ value }) => {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="text-gray-600 text-sm uppercase tracking-wide mb-2">Total Balance</div>
      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
        ₹{parseFloat(value).toFixed(2)}
      </div>
      <div className="mt-4 flex gap-4">
        <div className="bg-green-100 px-4 py-2 rounded-lg">
          <p className="text-xs text-gray-600">Available</p>
          <p className="text-lg font-semibold text-green-600">₹{parseFloat(value).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

Balance.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};