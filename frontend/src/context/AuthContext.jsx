import {
    createContext,
    useContext,
    useState
} from "react";

import {
    getToken,
    logoutUser
} from "../services/auth";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {

    const [token, setToken] = useState(
        getToken()
    );

    const [user, setUser] = useState(null);


    function login(accessToken, userData = null) {

        localStorage.setItem(
            "access_token",
            accessToken
        );

        setToken(accessToken);

        if (userData) {
            setUser(userData);
            localStorage.setItem(
                "user_data",
                JSON.stringify(userData)
            );
        }
    }


    function logout() {

        logoutUser();

        setToken(null);
        setUser(null);
        localStorage.removeItem("user_data");
    }


    const value = {

        token,

        user,

        isAuthenticated: Boolean(token),

        login,

        logout

    };


    return (

        <AuthContext.Provider value={value}>

            {children}

        </AuthContext.Provider>

    );

}


export function useAuth() {

    return useContext(
        AuthContext
    );

}