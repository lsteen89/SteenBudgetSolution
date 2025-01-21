import axiosInstance from "@api/axiosConfig"; // Use the custom Axios instance
import { UserLoginDto } from "../../../types/userLoginForm";
import { isAxiosError } from "axios"; // Static utility function

export const login = async (loginData: UserLoginDto): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axiosInstance.post("/api/Auth/login", loginData);

    return response.data;
  } catch (error: any) {
    if (isAxiosError(error)) { // Make sure to import isAxiosError if needed
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
    // Handle unexpected errors
    return {
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    };
  }
};