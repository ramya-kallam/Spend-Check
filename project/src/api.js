// api.js
import axios from 'axios';
import auth from '@react-native-firebase/auth';

const API_URL = 'http://10.0.2.2:5000'; // For Android emulator

// Get current auth token
const getAuthToken = async () => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  return await currentUser.getIdToken();
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Auth token error:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Transaction API functions
export const addTransaction = async (userId, transactionData) => {
  try {
    console.log(transactionData);
    const response = await api.post(`/api/users/${userId}/transactions`, transactionData);
    console.log(response)
    return response.data;
  } catch (error) {
    console.error('API Error adding transaction:', error.response?.data || error.message);
    throw error;
  }
};

export const getTransactions = async (userId, filters = {}) => {
  try {
    console.log("hi");
    const response = await api.get(`/api/users/${userId}/transactions`, { params: filters });
    return response.data;
  } catch (error) {
    console.error('API Error getting transactions:', error.response?.data || error.message);
    throw error;
  }
};

// Set or update budget
export const setBudget = async (userId, month, budgets) => {
  try {
    const response = await api.post(`/api/users/${userId}/budgets`, { month, budgets });
    return response.data;
  } catch (error) {
    console.error('API Error setting budget:', error.response?.data || error.message);
    throw error;
  }
};

// Get budget for a specific month
export const getBudget = async (userId, month) => {
  try {
    console.log(month);
    const response = await api.get(`/api/users/${userId}/budgets/${month}`, {
      // This prevents axios from throwing an error for 404
      validateStatus: function (status) {
        return (status >= 200 && status < 300) || status === 404;
      }
    });

    // Check the response status and handle accordingly
    if (response.status === 404) {
      return {
        success: false,
        message: 'No budget found for this month'
      };
    }

    return response.data;
  } catch (error) {
    console.error('API Error getting budget:', error.response?.data || error.message);
    throw error;
  }
};

// Get all budgets
export const getAllBudgets = async (userId) => {
  try {
    const response = await api.get(`/api/users/${userId}/budgets`);
    return response.data;
  } catch (error) {
    console.error('API Error getting all budgets:', error.response?.data || error.message);
    throw error;
  }
};

// Delete a budget
export const deleteBudget = async (userId, month) => {
  try {
    const response = await api.delete(`/api/users/${userId}/budgets/${month}`);
    return response.data;
  } catch (error) {
    console.error('API Error deleting budget:', error.response?.data || error.message);
    throw error;
  }
};

export const sendBudgetReminder = async () => {
  try {
    const response = await api.post("/send-budget-reminder");
    return response.data;
  } catch (error) {
    console.error("Error sending budget reminder:", error.response?.data || error.message);
    throw error;
  }
};

export const getBudgetSummary = async (userId, month) => {
  try {
    const response = await api.get(`/api/users/${userId}/get_budget_summary/${month}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    return null;
  }
};

export const parseVoiceText = async (text) => {
  try {
    console.log(text);
    const response = await api.post('/parse-voice-text', { text });
    console.log(response)
    return response.data;
  } catch (error) {
    console.error('API Error parsing voice text:', error.response?.data || error.message);
    throw error;
  }
};

export const uploadBillToServer = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  const isPDF = file.type === "application/pdf";

  formData.append("file", {
    uri: file.uri,
    name: file.name || (isPDF ? "uploaded_file.pdf" : "uploaded_file.jpg"),
    type: file.type || (isPDF ? "application/pdf" : "image/jpeg"),
  });

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Extract transaction details from uploaded file
export const extractTransactionFromFile = async (fileUrl, fileType) => {
  try {
    const response = await api.post('/extract-text', {
      fileUrl,
      fileType,
    });
    return response.data;
  } catch (error) {
    console.error('Extraction error:', error);
    throw error;
  }
};

export default api;