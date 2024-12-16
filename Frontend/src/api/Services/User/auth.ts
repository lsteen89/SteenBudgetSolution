import axios from "../../axiosConfig";
import { UserLoginDto } from "../../../types/userLoginForm";

export const login = async (loginData: UserLoginDto): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await axios.post("/api/Auth/login", loginData);


        return response.data;
    } catch (error: any) {
        if (error.response) {
            // Handle known backend errors
            return {
                success: false,
                message: error.response.data?.message || "Login failed",
            };
        }
        // Handle unexpected errors
        return {
            success: false,
            message: "An unexpected error occurred. Please try again later.",
        };
    }
};
