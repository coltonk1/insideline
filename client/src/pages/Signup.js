import React, { useState } from "react";

function App() {
    import("../styles/signup.css");

    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        username: "",
        display_name: "",
        password: "",
        email: "",
        realtor: false,
        realty_group: "",
    });

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
            console.log(formData);
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createUser", {
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

            // console.log(data);
            // console.log("Success:", data);
            window.location.href = "/login?status=1&email=" + formData.email;
        } catch (error) {
            let errorMessage = error.message;
            if (errorMessage.includes("users_username")) {
                setError("Username already in use.");
            } else if (errorMessage.includes("users_email")) {
                setError("Email already in use.");
            } else {
                setError(error.message);
            }
        }
    };

    return (
        <main id="wrapper">
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Display Name</label>
                    <input
                        type="text"
                        name="display_name"
                        placeholder="Display Name"
                        value={formData.display_name}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Username</label>
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
                <div>
                    <label>Email</label>
                    <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                </div>
                {/* <div>
                    <label>Are you a realtor?</label>
                    <input type="checkbox" name="realtor" checked={formData.realtor} onChange={handleChange} />
                </div>
                <div>
                    <label>Realty Group Name</label>
                    <input
                        type="text"
                        name="realty_group"
                        placeholder="Realty Group"
                        value={formData.realty_group}
                        onChange={handleChange}
                    />
                </div> */}

                <div className="spacer" />
                <div className="spacer" />
                <p>
                    By creating an account, you agree to our <a href="/tos">Terms</a> and have read and acknowledged the{" "}
                    <a href="/privacyPolicy">Privacy Policy</a>.
                </p>
                <div className="spacer" />
                <button type="submit" className="lightSpecialButton">
                    Create User
                </button>
                <p>
                    Already have an account? <a href="/login">Log in</a> instead
                </p>
                <p className="error">{error}</p>
            </form>
        </main>
    );
}

export default App;
