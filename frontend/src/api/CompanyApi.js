import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000",
    headers: {
        "Content-Type": "application/json",
    },
});

export const generateProject = async (payload) => {

    const response = await api.post(
        "/generate",
        payload
    );

    return response.data;
};

export default api;