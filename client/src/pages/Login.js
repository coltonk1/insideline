import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

function App() {
    import("../styles/signup.css");

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const status_ = queryParams.get("status");
    const email_ = queryParams.get("email");

    useEffect(() => {
        if (status_ == 1) {
            setEmail(email_);
        } else if (status_ == 2) {
            setElement(
                <div className="message">
                    <p>Your account has been verified</p>
                </div>
            );
        }
    }, [status_]);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [element, setElement] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (email_ && email_ !== "") {
            setEmail(email_);
        }
    }, [email_]);

    useEffect(() => {
        if (email !== "") {
            setElement(
                <div className="message">
                    <p>
                        Your account is unverified. Check your email for a verification link. If you didn't receive it,{" "}
                        <a
                            onClick={() => {
                                setElement(
                                    <div className="message">
                                        <p>Resending email...</p>{" "}
                                    </div>
                                );
                                resendEmail();
                            }}
                        >
                            click here to resend
                        </a>
                    </p>
                </div>
            );
        }
    }, [email]);

    async function callAPI(body) {
        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/resendEmailVerification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData, "Network response was not ok!");
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error:", error.message);
        }
    }

    const resendEmail = async () => {
        let result = await callAPI({ email: email });
        console.log(result);
        setElement(
            <div className="message">
                <p>
                    Resent verification email to {email}. Still didn't receive it? Click{" "}
                    <a
                        onClick={() => {
                            setElement(
                                <div className="message">
                                    <p>Resending email...</p>{" "}
                                </div>
                            );
                            resendEmail();
                        }}
                    >
                        here
                    </a>
                    <p> to try again.</p>
                </p>
            </div>
        );
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setElement("");
            setError("");
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/loginUser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Network response was not ok");
            }

            const data = await response.json();
            let result = data.message.split("||");
            localStorage.setItem("token", result[0]);
            localStorage.setItem("uuid", result[1]);
            window.location.href = "/home";
        } catch (error) {
            console.error("Error:", error.message);
            if (error.message == "Not verified") {
                setEmail(formData.username);
                setError("");
                return;
            }
            setError(error.message);
            setElement("");
        }
    };

    return (
        <main id="wrapper">
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username or Email</label>
                    <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
                </div>
                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="spacer" />
                <div className="spacer" />
                <button type="submit" className="lightSpecialButton">
                    Login
                </button>
                <p>
                    Need an account? <a href="/signup">Sign up</a> instead
                </p>
                {element}
                <p className="error">{error}</p>
            </form>
        </main>
    );
}

export default App;
