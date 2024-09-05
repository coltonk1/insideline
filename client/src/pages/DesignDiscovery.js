import { useState, useEffect } from "react";
import UserProfile from "./component/UserDisplay";
import SpotlightV from "./component/SpotlightV";

async function callAPI() {
    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("q");

    let body = {
        token: localStorage.getItem("token") || "",
        query: query || "",
        type: 2,
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
    return <div className="displayContainer">{props.children}</div>;
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

function ShowerRecent() {
    const [data, setData] = useState();

    useEffect(() => {
        const fetchData = async () => {
            let result = await callAPI();
            setData(result);
            console.log(result);
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
                    return (
                        <SpotlightV
                            post_uuid={element.PostUuid}
                            img_url={imgUrl + "_preview" + fileExtension}
                            title={element.Title}
                            author_uuid={element.AuthorUuid}
                            likes={element.Likes}
                            comments={element.Comments}
                            description={element.Description}
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
    import("../styles/spotlightsEx.css");

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            window.location.href = "/designDiscovery?q=" + encodeURIComponent(event.target.value);
        }
    };

    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("q") || "";
    return (
        <main>
            <input
                type="text"
                placeholder="What are you trying to find?"
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
