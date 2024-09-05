// src/PropertyListing.js
import React, { useState, useEffect } from "react";
import UserProfile from "./component/UserDisplay";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

async function soldAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/sold", {
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

async function callAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getSpecificPostData", {
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

// var requestBody struct {
//     Token string `json:"token"`
//     PostUUID string `'json:"post_uuid"`
// }
async function handleRemovePost(post_uuid, user_uuid) {
    const body = {
        post_uuid: post_uuid,
        token: localStorage.getItem("token"),
    };
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/removePost", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.log(errorData);
            throw new Error(errorData.message || "Network response was not ok");
        }

        const data = await response.text();
        window.location.href = "/profile/?uuid=" + user_uuid;
    } catch (error) {
        console.error("Error:", error.message);
    }
}

const PropertyListing = () => {
    import("../styles/PropertyListing.css");
    const [showModal, setShowModal] = useState(false);

    const [mainImage, setMainImage] = useState("");
    const [data, setData] = useState();

    const fetchData = async () => {
        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const uuid = queryParams.get("uuid");

        let result = await callAPI({ post_uuid: uuid });
        result.Payload = JSON.parse(result.Payload);
        console.log(result);
        setData(result);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setMainImage(data && data.ImageURLs[0]);
    }, [data]);

    const toggleModal = () => {
        setShowModal(!showModal);
    };

    function formatNumberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    const queryString = window.location.search;
    const queryParams = new URLSearchParams(queryString);
    const uuid = queryParams.get("uuid");

    const soldPopup = () => {
        let element = document.getElementById("soldPopup");
        if (element.style.display === "block") {
            element.style.display = "none";
        } else {
            element.style.display = "block";
        }
    };

    const handleSubmit = async () => {
        let body = {
            sold_price: parseInt(document.getElementById("sold-price").value),
            post_uuid: uuid,
            token: localStorage.getItem("token"),
        };

        let result = await soldAPI(body);

        if (result) {
            window.location.reload();
        }
    };

    return (
        <div className="property-listing">
            <div className="property-image-gallery">
                <div className="main-image" onClick={toggleModal}>
                    <img src={mainImage} alt="Main Property" className="square-image" />
                </div>
                <div className="image-previews">
                    {data &&
                        data.ImageURLs.map((img, index) => {
                            var imgUrl = img;
                            const lastDotIndex = imgUrl.lastIndexOf(".");
                            const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
                            imgUrl = imgUrl.substring(0, lastDotIndex);
                            return (
                                <img
                                    onClick={() => {
                                        setMainImage(img);
                                    }}
                                    src={imgUrl + "_preview" + fileExtension}
                                    key={index}
                                ></img>
                            );
                        })}
                </div>
            </div>

            <div className="property-details">
                <div className="top-container">
                    {data && <UserProfile uuid={data.AuthorUUID} />}
                    {data && data.Type == 0 && data.AuthorUUID === localStorage.getItem("uuid") ? (
                        <div className="edit-post-container">
                            <a className="edit-post" href={"/createPost?uuid=" + uuid}>
                                Edit
                            </a>
                            <a
                                className="remove-post"
                                onClick={() => {
                                    soldPopup();
                                }}
                            >
                                Mark as Sold
                            </a>
                            <div id="soldPopup">
                                <div>
                                    <label htmlFor="sold-price">How much did it sell for?</label>
                                    <input
                                        type="number"
                                        id="sold-price"
                                        onChange={(e) => {
                                            if (parseInt(e.target.value) > 1000000000) {
                                                e.target.value = 1000000000;
                                            }
                                        }}
                                    ></input>
                                </div>
                                <p className="sold-message">Once you click submit, you cannot delete the post from your account.</p>
                                <a
                                    className="lightSpecialButton"
                                    onClick={() => {
                                        handleSubmit();
                                    }}
                                >
                                    Submit
                                </a>
                            </div>
                            <a
                                className="remove-post"
                                onClick={() => {
                                    handleRemovePost(uuid, data.AuthorUUID);
                                }}
                            >
                                Remove
                            </a>
                        </div>
                    ) : (
                        ""
                    )}
                </div>

                <div className="price-section">
                    <h2>${data && formatNumberWithCommas(data.Payload.price)}</h2>
                    <p>{data && data.Title}</p>
                </div>

                <p className="property-stats">
                    {data &&
                        Object.entries(data.Payload).map(([key, value]) => {
                            if (key === "address" || key === "price") return;
                            return (
                                <div key={key}>
                                    <strong>{key}:</strong> {value}
                                </div>
                            );
                        })}
                </p>
                <p className="property-address">{data && data.Payload.address}</p>

                {/* <div className="tags-section">
                    <button>Show Tags</button>
                </div> */}

                <div className="property-description">
                    <p>{data && data.Description}</p>
                </div>
            </div>

            {showModal && (
                <div className="modal" onClick={toggleModal}>
                    <div className="modal-content">
                        <img src={mainImage} alt="Main Property Large" />
                    </div>
                </div>
            )}

            {data && <CustomMap lat={data.Latitude} long={data.Longitude} />}
        </div>
    );
};

function CustomMap({ lat, long }) {
    if (lat === 0 && long === 0) return <p className="map-not-found">Map data not found.</p>;
    return (
        <MapContainer id="map" center={[lat, long]} zoom={20} style={{ height: "400px", width: "100%", zIndex: 0 }}>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <Marker position={[lat, long]} />
        </MapContainer>
    );
}

export default PropertyListing;
