// SubmitButton.js
import React from 'react';
import './SubmitButton.css'; // Import the CSS for spinner styling

const SubmitButton = ({ isSubmitting, label = "Submit" }) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      style={{
        backgroundColor: isSubmitting ? '#ccc' : '#98FF98',
        borderRadius: '20px',
        fontFamily: 'Outfit, sans-serif',
        fontWeight: '800',
        fontSize: '20px',
        color: '#333333',
        padding: '10px 20px',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
        maxWidth: '150px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isSubmitting ? (
        <div className="spinner"></div>
      ) : (
        label
      )}
    </button>
  );
};

export default SubmitButton;
