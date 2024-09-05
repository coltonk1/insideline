import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useCallback } from "react";
import houseMarker from "../assets/houseMarker.png";
import houseMarkerShadow from "../assets/houseMarkerShadow.png";

import UserProfile from "./component/UserDisplay";

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

L.Icon.Default.mergeOptions({
    iconRetinaUrl: houseMarker,
    iconUrl: houseMarker,
    shadowUrl: houseMarkerShadow,
    iconSize: [40, 40],
    iconAnchor: [20, 0],
    popupAnchor: [0, 0],
});

const ChangeViewButton = ({ setInitialCenter, initialCenter }) => {
    const map = useMap();
    var marker;

    useEffect(() => {
        const customIcon = L.icon({
            iconUrl: "https://images.emojiterra.com/mozilla/1024px/1f535.png",
            iconSize: [16, 16], // Adjust size as needed
            iconAnchor: [8, 8], // Adjust anchor point
        });

        var location_data = JSON.parse(localStorage.getItem("user_location_data"));
        marker = L.marker([location_data.lat, location_data.lng], { icon: customIcon }).addTo(map);
    });

    const handleClick = async () => {
        const result = await getLocationFromAddress({ address: document.getElementById("location_input").value });
        if (!result) return;
        let longitude_per_pixel = getMapWidthInDegrees() / window.innerWidth;
        let list_width = document.getElementById("list").clientWidth;
        let offset = longitude_per_pixel * (window.innerWidth / 2 - (window.innerWidth - list_width) / 2);

        marker.setLatLng([result.lat, result.lng - offset]);
        map.setView([result.lat, result.lng]);
        setInitialCenter([result.lat, result.lng]);
    };

    useEffect(() => {
        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const q = queryParams.get("q");

        if (q) {
            document.getElementById("location_input").value = q;
            handleClick();
        }
    }, []);

    useEffect(() => {
        let updating = false;
        const handleMoveEnd = () => {
            if (updating) return;

            const result = map.getCenter();
            const newView = [result.lat, result.lng];

            if (initialCenter[0] !== newView[0] || initialCenter[1] !== newView[1]) {
                updating = true;
                let longitude_per_pixel = getMapWidthInDegrees() / window.innerWidth;
                let list_width = document.getElementById("list").clientWidth;
                let offset = longitude_per_pixel * (window.innerWidth / 2 - (window.innerWidth - list_width) / 2);
                marker.setLatLng([result.lat, result.lng - offset]);
                map.setView([result.lat, result.lng]);

                setInitialCenter([result.lat, result.lng]);
                setTimeout(() => {
                    updating = false;
                }, 100);
            }
        };

        map.on("moveend", handleMoveEnd);

        return () => {
            map.off("moveend", handleMoveEnd);
        };
    }, [map]);

    return (
        // onClick={handleClick}
        <div id="changeCoordinates">
            <input
                id="location_input"
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        handleClick();
                    }
                }}
                placeholder="Enter address, city, or zip"
            ></input>
            {/* <p>
                <a>Filters</a>
            </p>
            <p>
                <a>Sort by</a>
            </p> */}
            <p>
                <a
                    onClick={() => {
                        handleClick();
                    }}
                >
                    Search Now
                </a>
            </p>
        </div>
    );
};

let globalMap;

function getMapWidthInDegrees() {
    if (!globalMap) return 0;
    const bounds = globalMap.getBounds();
    const west = bounds.getWest();
    const east = bounds.getEast();
    const mapWidthInDegrees = Math.abs(east - west);
    return mapWidthInDegrees;
}

const MapComponent = () => {
    const zoomLevel = 13;
    const location_data = JSON.parse(localStorage.getItem("user_location_data"));
    const [initialCenter, setInitialCenter] = useState([location_data.lat, location_data.lng]);

    function ChangeView({ center }) {
        const map = useMap();
        globalMap = map;

        useEffect(() => {
            map.setView(center);
            setInitialCenter(center);
        }, [center]);

        return null;
    }

    const [data, setData] = useState();
    const [markers, setMarkers] = useState([]);

    const handleButtonClick = useCallback((value) => {
        let longitude_per_pixel = getMapWidthInDegrees() / window.innerWidth;
        let list_width = document.getElementById("list").clientWidth;
        let offset = longitude_per_pixel * (window.innerWidth / 2 - (window.innerWidth - list_width) / 2);

        value = [value[0], value[1]];
        setInitialCenter(value);
    }, []);

    useEffect(() => {
        console.log("change!!", initialCenter);
        const fetchData = async () => {
            let longitude_per_pixel = getMapWidthInDegrees() / window.innerWidth;
            let list_width = document.getElementById("list").clientWidth;
            let offset = longitude_per_pixel * (window.innerWidth / 2 - (window.innerWidth - list_width) / 2);

            const fetched_data = await getMarkersNear(initialCenter[0], initialCenter[1] - offset);
            console.log(fetched_data, [initialCenter[0], initialCenter[1] - offset]);
            setData(fetched_data);
        };

        fetchData();
    }, [initialCenter]);

    useEffect(() => {
        if (!data) return;

        var newMarkers = [...markers];
        data.forEach((new_data) => {
            newMarkers.push({
                position: [new_data.Lat, new_data.Lng],
                title: new_data.Title,
                post_uuid: new_data.PostUuid,
                author_uuid: new_data.AuthorUuid,
                description: new_data.Description,
                image_url: new_data.ImageURLs[0],
                payload: new_data.Payload,
            });
        });
        setMarkers(newMarkers);
    }, [data]);

    return (
        <section id="map">
            <HouseList moveCenter={handleButtonClick} data={data} />
            <MapContainer id="map" center={initialCenter} zoom={zoomLevel} style={{ height: "calc(100vh - 90px)", width: "100vw" }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <ChangeView center={initialCenter} />

                {data &&
                    markers.map((marker, idx) => {
                        let payload = JSON.parse(marker.payload);
                        var imgUrl = marker.image_url;
                        const lastDotIndex = imgUrl.lastIndexOf(".");
                        const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
                        imgUrl = imgUrl.substring(0, lastDotIndex);
                        return (
                            <Marker key={idx} position={marker.position}>
                                <Popup>
                                    {/* Marker at {marker.position[0]}, {marker.position[1]} */}
                                    {/* <br /> */}
                                    <div className="imgContainer">
                                        <img src={imgUrl + "_preview" + fileExtension}></img>
                                    </div>
                                    <div className="listingInfo">
                                        <title>{"$" + payload.price}</title>
                                        <div>
                                            {/* {Object.entries(payload).map(([key, value]) => {
                                                if (key === "price" || key === "address") return;
                                                return (
                                                    <div key={idx}>
                                                        <p>
                                                            {value} {key}
                                                        </p>
                                                    </div>
                                                );
                                            })} */}
                                        </div>
                                        <div>{payload.address}</div>
                                    </div>
                                    <p className="viewdetails">
                                        <a href={"/propertyInfo?uuid=" + marker.post_uuid}>View details</a>
                                    </p>
                                </Popup>
                            </Marker>
                        );
                    })}
                <ChangeViewButton setInitialCenter={handleButtonClick} initialCenter={initialCenter} />
            </MapContainer>
        </section>
    );
};

function DisplayContainer(props) {
    return <div className="displayContainer">{props.children}</div>;
}

function Display({ moveCenter, element }) {
    let payload = JSON.parse(element.Payload);
    var imgUrl = element.ImageURLs[0];
    const lastDotIndex = imgUrl.lastIndexOf(".");
    const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
    imgUrl = imgUrl.substring(0, lastDotIndex);
    return (
        <div className="displayItem" key={imgUrl}>
            <img src={imgUrl + "_preview" + fileExtension}></img>
            <div className="listingInfo">
                <title>${payload.price}</title>
                <div className="post-info">
                    {Object.entries(payload).map(([key, value], index) => {
                        if (key === "price" || key === "address") return;
                        return (
                            <div key={index}>
                                <p>
                                    {value} {key}
                                </p>
                            </div>
                        );
                    })}
                </div>
                <div>{payload.address}</div>
            </div>
            <div>
                <UserProfile uuid={element.AuthorUuid} />
                <p>
                    <a
                        onClick={() => {
                            moveCenter([element.Lat, element.Lng]);
                        }}
                    >
                        Go To
                    </a>
                </p>
                <p>
                    <a
                        onClick={() => {
                            window.location.href = "/propertyInfo?uuid=" + element.PostUuid;
                        }}
                    >
                        View Details
                    </a>
                </p>
            </div>
        </div>
    );
}

function HouseList({ moveCenter, data }) {
    return (
        <section id="list">
            {!data ? <div>No listings found.</div> : ""}
            <div>
                <DisplayContainer>
                    {data &&
                        data.map((element) => {
                            return <Display key={element.PostUuid} moveCenter={moveCenter} element={element} />;
                        })}
                </DisplayContainer>
            </div>
        </section>
    );
}

function App() {
    import("../styles/map.css");
    return (
        <main>
            <MapComponent />
        </main>
    );
}

export default App;
