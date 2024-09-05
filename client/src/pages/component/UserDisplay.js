import { useState, useEffect } from "react";

function UserDisplay({ uuid }) {
    async function callAPI2(uuid) {
        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/publicUserData", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ uuid: uuid }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Network response was not ok");
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error:", error.message);
        }
    }

    const [data, setData] = useState();

    useEffect(() => {
        const fetchData = async () => {
            if (!uuid) return;
            const result = await callAPI2(uuid);
            setData(result);
        };

        fetchData();
    }, [uuid]);

    return (
        <div className="user-details-container">
            <img
                src={process.env.REACT_APP_SERVER_URL + "/images/" + uuid + "_pfp.jpg"}
                alt="Author"
                className="user-img"
                onClick={() => {
                    window.location.href = "/profile?uuid=" + uuid;
                }}
            />
            <div
                className="user-details"
                onClick={() => {
                    window.location.href = "/profile?uuid=" + uuid;
                }}
            >
                <p>{data && data.display_name}</p>
                <p>@{data && data.username}</p>
            </div>
        </div>
    );
}

export default UserDisplay;
