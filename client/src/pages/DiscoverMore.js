import { useState, useEffect } from "react";
import UserProfile from "./component/UserDisplay";
import PropertyV from "./component/PropertyV";

async function callAPI() {
    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("q");

    let body = {
        token: localStorage.getItem("token") || "",
        query: query || "",
        type: 0,
    };

    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getRecommendedPostData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        var rawText = "";
        if (!response.ok) {
            let errorMessage;
            try {
                // Log the raw response text
                console.log(response);
                rawText = await response.text();
                console.error("Raw response text:", rawText);

                // Attempt to parse the response as JSON
                const errorData = JSON.parse(rawText);
                errorMessage = errorData.message || "Network response was not ok";
            } catch (jsonError) {
                // If the response is not JSON, use the raw text as the error message
                errorMessage = rawText || "Network response was not ok";
            }
            throw new Error(errorMessage);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

function DisplayContainer(props) {
    return <div className="displayContainerP">{props.children}</div>;
}

function Display(props) {
    return (
        <div
            className="displayItemS"
            onClick={() => {
                window.location.href = "/spotlightInfo?uuid=" + props.post_uuid;
            }}
        >
            <div className="imgContainer">
                <img src={props.imgURL} alt="Main content"></img>
            </div>
            <div className="infoContainer">
                <h1>{props.title}</h1>
                <div className="infoBottom">
                    <div className="user-details-container">
                        <UserProfile uuid={props.user_uuid} />
                    </div>
                    <div className="stats">
                        <div className="likes">
                            <img src="https://icons.veryicon.com/png/o/miscellaneous/ui-basic-linear-icon/like-106.png" alt="Likes"></img>
                            <p>{props.likes}</p>
                        </div>
                        <div className="comments">
                            <img src="https://static-00.iconduck.com/assets.00/comment-icon-1024x964-julk98bl.png" alt="Views"></img>
                            <p>{props.comments}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

async function callAPI2() {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getCurrentPostal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.json();

        localStorage.setItem("user_location_data", JSON.stringify(data));
        window.location.reload();
    } catch (error) {
        console.error("Error:", error.message);
    }
}

if (!localStorage.getItem("user_location_data")) {
    callAPI2();
}

async function getMarkersNear(lat, lng) {
    const body = {
        lat: lat,
        lng: lng,
    };

    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getMarkersNear", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
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

async function getLocationFromAddress(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getLocationFromAddress", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.json();
        const necessary_data = { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng };
        return necessary_data;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

function ShowerRecent() {
    const [data, setData] = useState();

    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("q") || "";

    useEffect(() => {
        const fetchData = async () => {
            let loc;
            // let result = await callAPI();
            let location = JSON.parse(localStorage.getItem("user_location_data"));
            if (query !== "") {
                loc = await getLocationFromAddress({ address: query });
                if (loc) {
                    location = loc;
                }
            }
            let result = await getMarkersNear(location.lat, location.lng);
            setData(result);
        };

        fetchData();
    }, []);

    return (
        <DisplayContainer>
            {data &&
                data.map((element, index) => {
                    var imgUrl = element["ImageURLs"][0];
                    const lastDotIndex = imgUrl.lastIndexOf(".");
                    const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
                    imgUrl = imgUrl.substring(0, lastDotIndex);
                    console.log(element);
                    const payload = JSON.parse(element.Payload);
                    return (
                        <PropertyV
                            postUUID={element.PostUuid}
                            imgURL={imgUrl + "_preview" + fileExtension}
                            price={payload.price}
                            payload={payload}
                            address={payload.address}
                        />
                        // <Display
                        //     key={index}
                        //     post_uuid={element.PostUuid}
                        //     imgURL={imgUrl + "_preview" + fileExtension}
                        //     title={element.Title}
                        //     user_uuid={element.AuthorUuid}
                        //     likes={element.Likes}
                        //     comments={element.Comments}
                        // />
                    );
                })}
        </DisplayContainer>
    );
}

function App() {
    import("../styles/propertyEx.css");
    import("../styles/discoverMore.css");

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            window.location.href = "/discoverMore?q=" + encodeURIComponent(event.target.value);
        }
    };

    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("q") || "";
    return (
        <main>
            <input
                type="text"
                placeholder="Where?"
                onKeyDown={(e) => {
                    handleKeyDown(e);
                }}
                defaultValue={query}
            ></input>
            <ShowerRecent />
        </main>
    );
}

export default App;
