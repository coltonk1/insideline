import { useEffect, useState } from "react";

async function callAPI() {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/privateUserData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: localStorage.getItem("token") }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error.message);
        return null;
    }
}

const uploadImage = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
        return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", 3);
    formData.append("token", localStorage.getItem("token"));

    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/uploadImage", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error uploading file:", error);
    }
};

function App() {
    import("../styles/settings.css");
    const [currentImage, setCurrentImage] = useState("");
    const [data, setData] = useState();

    const handleImageChange = async (event) => {
        const file = event.target.files[0]; // Get the first selected file
        if (file) {
            const imageUrl = URL.createObjectURL(file); // Create a URL for the selected image
            setCurrentImage(imageUrl); // Update the state with the new image URL
        }
        let result = await uploadImage(document.getElementById("pfp_input").files[0]);
        console.log(result);
    };

    const handleClick = async (e) => {
        document.getElementById("pfp_input").click();
    };

    const fetchData = async (e) => {
        let result = await callAPI();
        setData(result);
        console.log(result);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChanges = async () => {
        const body = {
            token: localStorage.getItem("token"),
            password: "",
            description: document.getElementById("description").value,
            realty_group: "",
            realtor: false,
            email: "",
            display_name: document.getElementById("display_name").value,
        };
        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/updateUser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData);
            }

            window.location.href = "/profile/?uuid=" + localStorage.getItem("uuid");
        } catch (error) {
            console.error("Error:", error.message);
            return null;
        }
    };

    return (
        <main>
            <input
                style={{ display: "none" }}
                id="pfp_input"
                type="file"
                accept="image/jpeg, image/png"
                onChange={(e) => {
                    handleImageChange(e);
                }}
            ></input>
            <div className="profile-picture-container">
                <img
                    className="profile-picture"
                    src={currentImage || process.env.REACT_APP_SERVER_URL + "/images/" + localStorage.getItem("uuid") + "_pfp.jpg"}
                ></img>
            </div>
            <a
                className="lightSpecialButton"
                onClick={() => {
                    handleClick();
                }}
            >
                Change Picture
            </a>
            {data && (
                <div>
                    <div>
                        <div id="lineCounter"></div>
                        <textarea id="description" defaultValue={data.description} placeholder="description" maxLength={750}></textarea>
                    </div>
                    <div>
                        <input id="display_name" defaultValue={data.display_name} placeholder="display name"></input>
                    </div>
                    <div>
                        <p>{data.username}</p>
                    </div>
                    {/* <div>{data.is_realtor ? "IS REALTOR" : "IS NOT REALTOR"}</div> */}
                    {/* {data.is_realtor && <div>{data.realty_group}</div>} */}
                    {/* <div>Account Type: {data.type}</div> */}
                    <a
                        className="lightSpecialButton"
                        onClick={() => {
                            handleChanges();
                        }}
                    >
                        Submit Other Info
                    </a>
                </div>
            )}

            {/* <a>Remove Account</a> */}
        </main>
    );
}

export default App;
