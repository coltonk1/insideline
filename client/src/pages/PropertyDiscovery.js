import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import houseMarker from "../assets/houseMarker.png";
import houseMarkerShadow from "../assets/houseMarkerShadow.png";

import PropertyV from "./component/PropertyV";

L.Icon.Default.mergeOptions({
    iconRetinaUrl: houseMarker,
    iconUrl: houseMarker,
    shadowUrl: houseMarkerShadow,
    iconSize: [40, 40],
    iconAnchor: [20, 0],
    popupAnchor: [0, 0],
});

async function callAPI() {
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
    callAPI();
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
            const errorData = await response.text();
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

function DisplayContainer(props) {
    return <div className="displayContainerP">{props.children}</div>;
}

function PropertyRecommendations() {
    return (
        <section id="recommendations">
            <div>
                <title>Want to see the listings around you?</title>
                <p>Use our map to view properties listed near you</p>
            </div>
            <a className="lightSpecialButton" href="/map" tabIndex={0}>
                View Map
            </a>
        </section>
    );
}

function App() {
    function HouseSearch() {
        return (
            <section id="main">
                <img
                    src={
                        "https://www.tennessean.com/gcdn/presto/2019/10/11/PNAS/adf1101a-0f8c-404f-9df3-5837bf387dfd-1_Exterior_House_Beautiful_Whole_Home_Concept_House_Castle_Homes_Photo_Reed_Brown_Photography.jpg?width=1200&disable=upscale&format=pjpg&auto=webp"
                    }
                    alt="Looking for your new home?"
                />
                <title>Looking for your new home? Find it here</title>
                {/* <div>
                    <div tabIndex={0}>Preferences</div>
                    <div tabIndex={0}>Type</div>
                    <div tabIndex={0}>Price Range</div>
                </div> */}
            </section>
        );
    }

    function HouseRecent() {
        const [data, setData] = useState();

        useEffect(() => {
            const fetchData = async () => {
                let current_location = JSON.parse(localStorage.getItem("user_location_data"));
                let result = await getMarkersNear(current_location.lat, current_location.lng);
                setData(result);
            };

            fetchData();
        }, []);

        return (
            <section id="recent">
                <div id="background" className="notmobile"></div>
                <title className="recent-title">
                    <p>Recently</p>Uploaded
                    <p>
                        Near <p className="bold inline">{JSON.parse(localStorage.getItem("user_location_data")).postal}</p>
                    </p>
                </title>
                <DisplayContainer>
                    {!data ? <div className="full-width">No properties have been uploaded near this zip code.</div> : ""}
                    {data &&
                        data.map((element) => {
                            var imgUrl = element.ImageURLs[0];
                            const lastDotIndex = imgUrl.lastIndexOf(".");
                            const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
                            imgUrl = imgUrl.substring(0, lastDotIndex);
                            console.log(element);
                            return (
                                <PropertyV
                                    postUUID={element.PostUuid}
                                    imgURL={imgUrl + "_preview" + fileExtension}
                                    price={JSON.parse(element.Payload).price}
                                    address={JSON.parse(element.Payload).address}
                                    payload={JSON.parse(element.Payload)}
                                />
                            );
                        })}
                </DisplayContainer>
                <a className="lightSpecialButton" href="/discoverMore" tabIndex={0}>
                    Discover more
                </a>
            </section>
        );
    }
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            window.location.href = "/map?q=" + encodeURIComponent(event.target.value);
        }
    };

    import("../styles/home.css");
    import("../styles/propertyEx.css");
    return (
        <main>
            <HouseSearch />
            <div className="main-search">
                <img src="/search-icon2.png" className="right-input-image" />
                <input
                    type="text"
                    placeholder="Where do you want to live?"
                    onKeyDown={(e) => {
                        handleKeyDown(e);
                    }}
                ></input>
            </div>
            <HouseRecent />
            <PropertyRecommendations />
        </main>
    );
}

export default App;
