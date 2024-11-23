import axios from '../../axiosConfig'; // Use axiosConfig for consistent configuration

/**
 * Submit contact form data
 * @param {Object} formData - The data to submit via contact form
 * @returns {Promise<Object>} - Axios response promise with status and message
 */

export const submitContactForm = async (formData) => {
  try {
    const response = await axios.post('/api/Email/ContactUs', formData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return { status: response.status, message: response.data.message };
  } catch (error) {
    const status = error.response?.status || 'Unknown status';
    const message = error.response?.data?.message || 'Failed to submit contact form';
    console.error('Error submitting contact form:', error);
    return { status, message }; // Return status and message to handle in React
  }
};
