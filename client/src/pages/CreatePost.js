import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function ImageDisplay({ imageData, changeScale, changePosition, changePreview }) {
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [position, setPosition] = useState({ left: 0, top: 0 });
    const [scale, setScale] = useState(1);
    const containerRef = useRef(null);
    const imageRef = useRef(null);

    useEffect(() => {
        setPosition({ left: imageData.position.left, top: imageData.position.top });
        setScale(imageData.scale);
    }, [imageData]);

    useEffect(() => {
        adjustImageToFill(scale);
    }, [position]);

    const adjustImageToFill = (newScale) => {
        if (!imageRef.current) return;

        const image = imageRef.current.getBoundingClientRect();

        let newPosition = { ...position };

        const maxX = ((image.width / scale) * newScale - 400) / 2;
        const maxY = ((image.height / scale) * newScale - 400) / 2;

        if (newPosition.left > maxX) newPosition.left = maxX;
        else if (newPosition.left < -maxX) newPosition.left = -maxX;

        if (newPosition.top > maxY) newPosition.top = maxY;
        else if (newPosition.top < -maxY) newPosition.top = -maxY;

        if (newPosition.left !== position.left || newPosition.top !== position.top) {
            setPosition(newPosition);
        }
    };

    const calculateVisibleArea = () => {
        if (!imageRef.current || !containerRef.current) return null;

        const image = imageRef.current.getBoundingClientRect();
        const container = containerRef.current.getBoundingClientRect();
        const containerWidth = 400; // Assuming the container is 400x400
        const containerHeight = 400;

        const scaleX = image.width / scale;
        const scaleY = image.height / scale;

        let multiplier = imageRef.current.naturalWidth / scaleX;

        const visibleLeft = -(image.left - container.left) / scale;
        const visibleTop = -(image.top - container.top) / scale;
        const visibleWidth = containerWidth / scale;
        const visibleHeight = containerHeight / scale;

        return {
            pos_x: Math.round(visibleLeft * multiplier),
            pos_y: Math.round(visibleTop * multiplier),
            crop_width: Math.round(visibleWidth * multiplier),
            crop_height: Math.round(visibleHeight * multiplier),
            img_width: Math.round(scaleX * multiplier),
            img_height: Math.round(scaleY * multiplier),
        };
    };

    const onConfirm = () => {
        const visibleArea = calculateVisibleArea();
        changePosition(position);
        changeScale(scale);
        changePreview(visibleArea);
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setStartX(e.clientX - position.left);
        setStartY(e.clientY - position.top);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const left = e.clientX - startX;
        const top = e.clientY - startY;

        setPosition({ left, top });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleScale = (value) => {
        adjustImageToFill(value);
        setScale(value);
    };

    return (
        <div id="displayImageClickContainer">
            <div className="overlay"></div>
            <input
                id="imgScale"
                type="range"
                min="1"
                max="1.5"
                step="0.02"
                value={Math.sqrt(scale)}
                onChange={(e) => handleScale(e.target.value ** 2)}
            />
            <div
                id="displayImageClick"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    cursor: isDragging ? "grabbing" : "grab",
                }}
            >
                <div id="displayImageContainer" ref={containerRef}>
                    <div
                        id="displayImage"
                        style={{
                            position: "absolute",
                            top: `calc(${position.top}px + 50%)`,
                            left: `calc(${position.left}px + 50%)`,
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        <img
                            onLoad={(e) => {
                                if (e.target.width > e.target.height) {
                                    e.target.style.width = "auto";
                                    e.target.style.height = "400px";
                                } else {
                                    e.target.style.width = "400px";
                                    e.target.style.height = "auto";
                                }
                            }}
                            ref={imageRef}
                            src={imageData.src}
                            id="displayImgSrc"
                            alt=""
                        />
                    </div>
                </div>
            </div>
            <a onClick={onConfirm}>Confirm Changes</a>
        </div>
    );
}

async function callAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/createPost", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        } else {
            return await response.json();
        }
    } catch (error) {
        return error.message;
    }
}

async function callAPI2(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/updatePost", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        } else {
            return await response.json();
        }
    } catch (error) {
        return error.message;
    }
}

function PropertyPost({ presetData, portfolio = false }) {
    const [images, setImages] = useState([]);
    const [displayImage, setDisplayImage] = useState({ src: "", scale: 1, position: { left: 0, top: 0 } });
    const [filter, setFilter] = useState("");
    const [determinedTags, setDeterminedTags] = useState([]);
    const [activeValues, setActiveValues] = useState([]);
    const [currentTags, setCurrentTags] = useState([]);
    const [error, setError] = useState("");

    const [usingPortfolio, setUsingPortfolio] = useState(portfolio);

    useEffect(() => {
        setUsingPortfolio(portfolio);
    }, [portfolio]);

    const initialize = () => {
        var newImageData = [];
        presetData.ImageURLs.forEach((item) => {
            newImageData.push({ position: { left: 0, top: 0 }, preview: null, scale: 1, src: item });
        });
        setImages(newImageData);

        var newDeterminedTags = [];
        var newActiveValues = [];
        var element;
        var type;
        Object.keys(presetData.Payload).forEach((value) => {
            if (value === "address" || value === "price") return;
            let index = values.indexOf(value);
            type = "text";
            if (index !== -1) {
                type = value_types[index];
            } else {
                values.unshift(value);
                value_types.unshift("text");
            }
            newActiveValues.push(value);
            switch (type) {
                case "num":
                    element = (
                        <div className="value-data" key={value + "A"}>
                            <div className="value-img">
                                <img
                                    onClick={() => {
                                        filterValue(value);
                                    }}
                                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_pHPK0HI35BunAVRZiPetqOfl6TwwLfXgjpOrMq6BN-uGv6JyWEy2EEbi8n4dfWWWCH4&usqp=CAU"
                                ></img>
                            </div>
                            <label htmlFor={value + "input"}>{value}</label>
                            <input
                                id={value + "input"}
                                max="1000000"
                                defaultValue={presetData.Payload[value]}
                                onChange={(e) => {
                                    if (parseInt(e.target.value) > 1000000) {
                                        e.target.value = 1000000;
                                    }
                                }}
                                type="number"
                            ></input>
                        </div>
                    );
                    break;
                case "text":
                    element = (
                        <div className="value-data" key={value + "A"}>
                            <div className="value-img">
                                <img
                                    onClick={() => {
                                        filterValue(value);
                                    }}
                                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_pHPK0HI35BunAVRZiPetqOfl6TwwLfXgjpOrMq6BN-uGv6JyWEy2EEbi8n4dfWWWCH4&usqp=CAU"
                                ></img>
                            </div>
                            <label htmlFor={value + "input"}>{value}</label>
                            <input id={value + "input"} type="text" defaultValue={presetData.Payload[value]} maxLength={30}></input>
                        </div>
                    );
                    break;
            }
            newDeterminedTags.push(element);
        });
        setDeterminedTags(newDeterminedTags);
        setActiveValues(newActiveValues);
    };

    useEffect(() => {
        if (!presetData) return;
        try {
            presetData.Payload = JSON.parse(presetData.Payload);
        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
        initialize();
        console.log(presetData);
    }, [presetData]);

    const submitFormData = async () => {
        let body = {};
        let payload = {};

        if (images.length === 0) {
            setError("Must have at least 1 image.");
            return;
        }

        const price = document.querySelectorAll("#price")[usingPortfolio ? 1 : 0].value;
        if (price === "") {
            setError("Must have a price.");
            return;
        }
        payload["price"] = price;
        const address = document.getElementById("address").value;
        if (address === "") {
            setError("Must have an address.");
            return;
        }
        payload["address"] = address;
        body["title"] = document.getElementById("title").value;
        if (body["title"] === "") {
            setError("Must have a title.");
            return;
        }

        let tag_parent = document.getElementsByClassName("tags-section")[0];
        determinedTags.forEach((tag, index) => {
            let tag_title = tag.props.children[1].props.children;
            let tag_value = tag_parent.children[index].children[2].value;
            payload[tag_title] = tag_value;
        });

        const description = document.getElementById("description").value;
        body["description"] = description;
        body["token"] = localStorage.getItem("token");
        body["type"] = usingPortfolio ? 1 : 0;
        body["private"] = false;
        body["realty_group_name"] = "";
        body["payload"] = JSON.stringify(payload);
        body["image_urls"] = images;

        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const uuid = queryParams.get("uuid");

        var result;
        if (uuid) {
            body["post_uuid"] = uuid;
            console.log(body);
            result = await callAPI2(body);
        } else {
            console.log(body);
            result = await callAPI(body);
        }

        if (result.success) {
            window.location.href = result.message;
        }
        setError(result);
    };

    useEffect(() => {
        document.querySelectorAll("textarea, input").forEach((element) => {
            element.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault(); // Prevents the form from submitting
                }
            });
        });
    }, []);

    useEffect(() => {
        console.log(images);
    }, [images]);

    const changeScale = (scale) => {
        setImages((prevImages) => prevImages.map((img) => (img.src === displayImage.src ? { ...img, scale } : img)));
        setDisplayImage((prev) => ({ ...prev, scale }));
    };

    const changePosition = (position) => {
        setImages((prevImages) => prevImages.map((img) => (img.src === displayImage.src ? { ...img, position } : img)));
        setDisplayImage((prev) => ({ ...prev, position }));
    };

    const changePreview = (newPreviewData) => {
        setImages((prevImages) => prevImages.map((img) => (img.src === displayImage.src ? { ...img, preview: newPreviewData } : img)));
    };

    const onFileChange = async (e) => {
        const files = e.target.files;

        for (let i = 0; i < files.length; i++) {
            if (i >= 50 - images.length) {
                break;
            }
            const file = files[i];
            await uploadImage(file);
        }
    };

    const uploadImage = async (file) => {
        if (file.size > 5 * 1024 * 1024) {
            return;
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("token", localStorage.getItem("token"));
        formData.append("type", 0);

        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/uploadImage", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            const newImage = {
                src: process.env.REACT_APP_SERVER_URL + `/images/${data.message}`,
                scale: 1,
                position: { left: 0, top: 0 },
                preview: null,
            };
            setImages((prevImages) => [newImage, ...prevImages]);
        } catch (error) {
            console.error("Error uploading file:", error);
        }
        return;
    };

    const removeImage = (imageToRemove) => {
        setImages((prevImages) => prevImages.filter((img) => img.src !== imageToRemove));
        if (displayImage.src === imageToRemove) {
            setDisplayImage((prev) => ({ ...prev, src: null }));
        }
    };

    const swapImages = (index, direction) => {
        setImages((prevImages) => {
            const newImages = [...prevImages];
            const otherIndex = index + direction;
            if (otherIndex >= 0 && otherIndex < newImages.length) {
                [newImages[index], newImages[otherIndex]] = [newImages[otherIndex], newImages[index]];
            }
            return newImages;
        });
    };

    const getCurrentValue = useCallback(() => {
        console.log(determinedTags, activeValues);
    }, [determinedTags, activeValues]);

    const filterValue = (value) => {
        setActiveValues((prevActiveValues) => {
            const newActiveValues = prevActiveValues.filter((item) => item !== value);
            return newActiveValues;
        });

        setDeterminedTags((prevDeterminedTags) => {
            const newArray = prevDeterminedTags.filter((item) => {
                return item.props.children[1].props.children !== value;
            });
            return newArray;
        });
    };

    return (
        <form>
            <div id="imagesP">
                <div>
                    <p>+</p>
                    <input type="file" onChange={onFileChange} multiple accept="image/jpeg, image/png" />
                </div>
                {images.map((img, index) => (
                    <div key={img.src} className="imageContainer">
                        <div className="image-buttons">
                            <a
                                id="left"
                                type="button"
                                onClick={() => {
                                    console.log("yoo");
                                    swapImages(index, -1);
                                }}
                                style={{ transform: "rotate(180deg)" }}
                            >
                                <img src="https://cdn-icons-png.flaticon.com/512/32/32213.png"></img>
                            </a>
                            <a id="right" type="button" onClick={() => swapImages(index, 1)}>
                                <img src="https://cdn-icons-png.flaticon.com/512/32/32213.png"></img>
                            </a>
                            <a id="trash" type="button" onClick={() => removeImage(img.src)}>
                                <img src="https://cdn-icons-png.flaticon.com/512/6861/6861362.png"></img>
                            </a>
                        </div>
                        <div className="mainImage">
                            <img
                                onClick={() => {
                                    setDisplayImage({ ...img });
                                }}
                                src={img.src}
                                alt={`image ${index}`}
                                style={{
                                    position: "absolute",
                                    left: `calc(${img.position.left / (400 / 200)}px + 50%)`,
                                    top: `calc(${img.position.top / (400 / 200)}px + 50%)`,
                                    transform: `translate(-50%, -50%) scale(${img.scale})`,
                                }}
                                onLoad={(e) => {
                                    if (e.target.width > e.target.height) {
                                        e.target.style.width = "auto";
                                        e.target.style.height = "200px";
                                    } else {
                                        e.target.style.width = "200px";
                                        e.target.style.height = "auto";
                                    }
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {/* {displayImage.src && (
                <ImageDisplay
                    changePreview={changePreview}
                    changeScale={changeScale}
                    changePosition={changePosition}
                    imageData={displayImage}
                />
            )} */}

            <div className="form-group">
                <label htmlFor="price">Price</label>
                <div className="multi-input">
                    <div type="number" id="price_type">
                        $
                    </div>
                    <input
                        type="number"
                        step="100"
                        id="price"
                        max="1000000000"
                        className="input-field"
                        defaultValue={presetData && presetData.Payload.price}
                        onChange={(e) => {
                            if (parseInt(e.target.value) > 1000000000) {
                                e.target.value = 1000000000;
                            }
                        }}
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                    type="text"
                    id="address"
                    maxLength={200}
                    defaultValue={presetData && presetData.Payload.address}
                    disabled={presetData ? true : false}
                    className="input-field"
                />
            </div>
            <div className="form-group">
                <label htmlFor="title">Title</label>
                <input type="text" id="title" maxLength={200} defaultValue={presetData && presetData.Title} className="input-field" />
            </div>
            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    maxLength={500}
                    id="description"
                    className="input-field"
                    defaultValue={presetData && presetData.Description}
                    onChange={(e) => {
                        e.target.style.height = "1px";
                        e.target.style.height = e.target.scrollHeight + "px";
                    }}
                />
            </div>
            <br />
            <div className="form-group data-group">
                <div className="data-parent">
                    <label>Data</label>
                    <div className="tags-section">
                        {determinedTags}
                        {/* <div
                        className="add-tag"
                        onClick={() => {
                            document.getElementById("tagDrop").style.display = "block";
                        }}
                    >
                        Add Data
                    </div> */}
                    </div>
                </div>
                <div id="tagDrop" className="tag-drop">
                    <input
                        type="text"
                        className="input-field"
                        onChange={(e) => {
                            values[values.length - 1] = e.target.value;
                            setFilter(e.target.value);
                        }}
                        placeholder="Search for value"
                    />
                    <ul className="tag-list">
                        {values.map((value, index) => {
                            if (!value.toLowerCase().includes(filter.toLowerCase())) return "";
                            if (index === values.length - 1) {
                                let isSame = false;
                                for (let i = 0; i < values.length - 1; i++) {
                                    if (values[i] === value) {
                                        isSame = true;
                                        break;
                                    }
                                }
                                if (isSame) {
                                    return "";
                                }
                            }
                            let class_name = "tag-item";
                            if (index == values.length - 1) class_name += " last-tag";
                            if (activeValues.indexOf(value) !== -1) class_name += " active-tag";
                            return (
                                <li
                                    style={value == "" ? { display: "none" } : {}}
                                    key={index}
                                    className={class_name}
                                    onClick={(e) => {
                                        if (e.target.className.includes("last-tag")) {
                                            if (activeValues.indexOf(value) === -1) {
                                                values.unshift(value);
                                                value_types.unshift("text");
                                            }
                                        }
                                        if (document.getElementById(value + "input") !== null) {
                                            filterValue(value);
                                            return;
                                        }
                                        var element;
                                        switch (value_types[index]) {
                                            case "num":
                                                element = (
                                                    <div className="value-data" key={value + "A"}>
                                                        <div className="value-img">
                                                            <img
                                                                onClick={() => {
                                                                    filterValue(value);
                                                                }}
                                                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_pHPK0HI35BunAVRZiPetqOfl6TwwLfXgjpOrMq6BN-uGv6JyWEy2EEbi8n4dfWWWCH4&usqp=CAU"
                                                            ></img>
                                                        </div>
                                                        <label htmlFor={value + "input"}>{value}</label>
                                                        <input
                                                            id={value + "input"}
                                                            max="1000000"
                                                            onChange={(e) => {
                                                                if (parseInt(e.target.value) > 1000000) {
                                                                    e.target.value = 1000000;
                                                                }
                                                            }}
                                                            type="number"
                                                        ></input>
                                                    </div>
                                                );
                                                break;
                                            case "text":
                                                element = (
                                                    <div className="value-data" key={value + "A"}>
                                                        <div className="value-img">
                                                            <img
                                                                onClick={() => {
                                                                    filterValue(value);
                                                                }}
                                                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_pHPK0HI35BunAVRZiPetqOfl6TwwLfXgjpOrMq6BN-uGv6JyWEy2EEbi8n4dfWWWCH4&usqp=CAU"
                                                            ></img>
                                                        </div>
                                                        <label htmlFor={value + "input"}>{value}</label>
                                                        <input id={value + "input"} type="text" maxLength={30}></input>
                                                    </div>
                                                );
                                                break;
                                        }
                                        setActiveValues([...activeValues, value]);
                                        setDeterminedTags([...determinedTags, element]);
                                    }}
                                >
                                    {value}
                                    <div className="decider-img-container">
                                        <img
                                            src={
                                                activeValues.indexOf(value) !== -1
                                                    ? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_pHPK0HI35BunAVRZiPetqOfl6TwwLfXgjpOrMq6BN-uGv6JyWEy2EEbi8n4dfWWWCH4&usqp=CAU"
                                                    : "https://cdn4.iconfinder.com/data/icons/social-messaging-ui-color-squares-01/3/03-512.png"
                                            }
                                        ></img>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
            <div className="form-group">
                <label htmlFor="price">Move to portfolio?</label>
                <input
                    type={"checkbox"}
                    checked={usingPortfolio}
                    onChange={(e) => {
                        setUsingPortfolio(e.target.checked);
                    }}
                ></input>
            </div>
            {usingPortfolio ? (
                <div className="form-group">
                    <label htmlFor="price">Sold Price</label>
                    <div className="multi-input">
                        <div type="number" id="price_type">
                            $
                        </div>
                        <input
                            type="number"
                            step="100"
                            id="price"
                            max="1000000000"
                            className="input-field"
                            defaultValue={presetData && presetData.Payload.price}
                            onChange={(e) => {
                                if (parseInt(e.target.value) > 1000000000) {
                                    e.target.value = 1000000000;
                                }
                            }}
                        />
                    </div>
                </div>
            ) : (
                ""
            )}
            <br />
            <br />
            <br />
            {/* <div className="form-group custom-tags">
                <label>Tags</label>
                <input
                    className="input-field"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (currentTags.includes(e.target.value.toLowerCase())) return;
                            setCurrentTags([...currentTags, e.target.value.toLowerCase()]);
                            e.target.value = "";
                        }
                    }}
                ></input>
            </div>
            <div>
                {currentTags.map((tag, index) => {
                    return <div>{tag}</div>;
                })}
            </div> */}
            <a
                onClick={() => {
                    submitFormData();
                }}
                className="lightSpecialButton"
            >
                Submit
            </a>

            <p className="error">{error}</p>
        </form>
    );
}

const values = [
    "SqFt",
    "Acres",
    "Beds",
    "Baths",
    "Parking",
    "Year Built",
    "Stories",
    "Amenities",
    "Heating/Cooling",
    "Roof Type",
    "Exterior",
    "View",
    "Condition",
    "HOA Fees",
    "",
];

const value_types = ["num", "num", "num", "num", "text", "num", "text", "text", "text", "text", "text", "text", "text", "text", "text"];

function SpotlightPost({ presetData }) {
    const [images, setImages] = useState([]);
    const [displayImage, setDisplayImage] = useState({ src: "", scale: 1, position: { left: 0, top: 0 } });
    const [currentTags, setCurrentTags] = useState([]);

    const [error, setError] = useState("");

    useState(() => {
        if (!presetData) return;
        var newImageData = [];
        presetData.ImageURLs.forEach((item) => {
            newImageData.push({ position: { left: 0, top: 0 }, preview: null, scale: 1, src: item });
        });
        setImages(newImageData);
    }, [presetData]);

    const submitFormData = async () => {
        let body = {};
        let payload = {};

        if (images.length === 0) {
            setError("Must have at least 1 image.");
            return;
        }

        body["title"] = document.getElementById("title").value;
        const description = document.getElementById("description").value;
        body["description"] = description;
        body["token"] = localStorage.getItem("token");
        body["type"] = 2;
        body["private"] = false;
        body["realty_group_name"] = "";
        body["payload"] = JSON.stringify(payload);
        body["image_urls"] = images;

        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const uuid = queryParams.get("uuid");

        var result;
        if (uuid) {
            body["post_uuid"] = uuid;
            result = await callAPI2(body);
        } else {
            result = await callAPI(body);
        }

        if (result.success) {
            window.location.href = result.message;
        }
        setError(result);
    };

    useEffect(() => {
        document.querySelectorAll("textarea, input").forEach((element) => {
            element.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault(); // Prevents the form from submitting
                }
            });
        });
    }, []);

    useEffect(() => {
        console.log(images);
    }, [images]);

    const changePreview = (newPreviewData) => {
        setImages((prevImages) => prevImages.map((img) => (img.src === displayImage.src ? { ...img, preview: newPreviewData } : img)));
    };

    const onFileChange = async (e) => {
        const files = e.target.files;

        for (let i = 0; i < files.length; i++) {
            if (i >= 5 - images.length) {
                break;
            }
            const file = files[i];
            await uploadImage(file);
        }
    };

    const uploadImage = async (file) => {
        if (file.size > 5 * 1024 * 1024) {
            return;
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("type", 2);
        formData.append("token", localStorage.getItem("token"));

        try {
            const response = await fetch(process.env.REACT_APP_SERVER_URL + "/uploadImage", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            const newImage = {
                src: process.env.REACT_APP_SERVER_URL + `/images/${data.message}`,
                scale: 1,
                position: { left: 0, top: 0 },
                preview: null,
            };
            setTimeout(() => {
                setImages((prevImages) => [newImage, ...prevImages]);
            }, 500);
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    const removeImage = (imageToRemove) => {
        setImages((prevImages) => prevImages.filter((img) => img.src !== imageToRemove));
        if (displayImage.src === imageToRemove) {
            setDisplayImage((prev) => ({ ...prev, src: null }));
        }
    };

    const swapImages = (index, direction) => {
        setImages((prevImages) => {
            const newImages = [...prevImages];
            const otherIndex = index + direction;
            if (otherIndex >= 0 && otherIndex < newImages.length) {
                [newImages[index], newImages[otherIndex]] = [newImages[otherIndex], newImages[index]];
            }
            return newImages;
        });
    };
    return (
        <form className="spotlightForm">
            <div id="images">
                <div>
                    <p>+</p>
                    <input type="file" onChange={onFileChange} multiple accept="image/jpeg, image/png" />
                </div>
                {images.map((img, index) => {
                    let imgSrc = img.src;
                    let extension = imgSrc.substring(imgSrc.lastIndexOf("."));
                    let newSrc = imgSrc.substring(0, imgSrc.lastIndexOf(".")) + "_preview" + extension;
                    return (
                        <div key={img.src} className="imageContainer">
                            <div className="image-buttons">
                                <a
                                    id="left"
                                    type="button"
                                    onClick={() => {
                                        swapImages(index, -1);
                                    }}
                                    style={{ transform: "rotate(180deg)" }}
                                >
                                    <img src="https://cdn-icons-png.flaticon.com/512/32/32213.png"></img>
                                </a>
                                <a id="right" type="button" onClick={() => swapImages(index, 1)}>
                                    <img src="https://cdn-icons-png.flaticon.com/512/32/32213.png"></img>
                                </a>
                                <a id="trash" type="button" onClick={() => removeImage(img.src)}>
                                    <img src="https://cdn-icons-png.flaticon.com/512/6861/6861362.png"></img>
                                </a>
                            </div>

                            <div className="mainImage">
                                <img src={newSrc} alt={`image ${index}`} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <br />
            <br />

            <div className="form-group">
                <label htmlFor="title">Title</label>
                <input type="text" id="title" maxLength={100} defaultValue={presetData && presetData.Title} className="input-field" />
            </div>
            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    defaultValue={presetData && presetData.Description}
                    maxLength={500}
                    id="description"
                    className="input-field"
                    onChange={(e) => {
                        e.target.style.height = "1px";
                        e.target.style.height = e.target.scrollHeight + "px";
                    }}
                />
            </div>
            {/* <div className="form-group custom-tags">
                <label>Tags</label>
                <input
                    className="input-field"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (currentTags.includes(e.target.value.toLowerCase())) return;
                            setCurrentTags([...currentTags, e.target.value.toLowerCase()]);
                            e.target.value = "";
                        }
                    }}
                ></input>
            </div> */}
            {/* <div>
                {currentTags.map((tag, index) => {
                    return <div>{tag}</div>;
                })}
            </div> */}
            <br />
            <br />

            <a
                onClick={() => {
                    submitFormData();
                }}
                className="lightSpecialButton"
            >
                Submit
            </a>

            <p className="error">{error}</p>
        </form>
    );
}

function App() {
    const [presetData, setPresetData] = useState();

    const navigate = useNavigate();

    const updateUrl = (whereAt) => {
        // Construct the new URL with query parameters or path
        const newUrl = `/createPost?current=` + whereAt;

        // Update the URL without reloading the page
        navigate(newUrl, { replace: true });
    };

    import("../styles/createPost.css");
    const [usingSpotlight, setUsingSpotlight] = useState(false);
    const [usingPortfolio, setUsingPortfolio] = useState(false);
    async function callAPII(body) {
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
    const fetchData = async (uuid) => {
        let result = await callAPII({ post_uuid: uuid });
        if (result.Type === 2) {
            setUsingSpotlight(true);
        } else if (result.Type === 0) {
            setUsingSpotlight(false);
        }

        setPresetData(result);
    };

    useEffect(() => {
        const queryString = window.location.search;
        const queryParams = new URLSearchParams(queryString);
        const current = queryParams.get("current");
        const uuid = queryParams.get("uuid");
        if (uuid !== null) {
            fetchData(uuid);
            return;
        }
        if (current === "spotlight") {
            setUsingSpotlight(true);
        } else if (current === "portfolio") {
            setUsingPortfolio(true);
        }
    }, []);

    return (
        <main>
            <div>
                <p className="form-selector">
                    <a
                        className={usingSpotlight ? "active" : ""}
                        onClick={() => {
                            setUsingSpotlight(true);
                            updateUrl("spotlight");
                            setPresetData(null);
                        }}
                    >
                        Spotlight
                    </a>{" "}
                    <a
                        className={!usingSpotlight ? "active" : ""}
                        onClick={() => {
                            setUsingSpotlight(false);
                            setUsingPortfolio(false);
                            updateUrl("property");
                            setPresetData(null);
                        }}
                    >
                        Property
                    </a>
                </p>
            </div>
            {usingSpotlight ? (
                <SpotlightPost presetData={presetData}></SpotlightPost>
            ) : usingPortfolio ? (
                <PropertyPost portfolio={true} presetData={presetData}></PropertyPost>
            ) : (
                <PropertyPost portfolio={false} presetData={presetData}></PropertyPost>
            )}
        </main>
    );
}

export default App;
