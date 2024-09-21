import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import UserProfile from "./component/UserDisplay";
import SpotlightV from "./component/SpotlightV";
import SpotlightVC from "./component/SpotlightVC";
import PropertyV from "./component/PropertyV";

function DisplayContainerProperty(props) {
    return <div className="displayContainerP">{props.children}</div>;
}

function Properties() {
    import("../styles/propertyEx.css");
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const uuid = queryParams.get("uuid");
    const ownerOfProfile = uuid === localStorage.getItem("uuid");

    const [data, setData] = useState();

    const fetchData = async () => {
        let result = await callAPI({ author_uuid: uuid, type: 0 });
        setData(result);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <section id="list">
            <div>
                <DisplayContainerProperty>
                    {!data ? (
                        <div className="no-posts">
                            There are no posts.{" "}
                            {ownerOfProfile ? (
                                <p>
                                    Create a post <a href="/createPost">here</a>
                                </p>
                            ) : (
                                ""
                            )}
                        </div>
                    ) : (
                        ""
                    )}
                    {data &&
                        data.map((element, index) => {
                            console.log(element);
                            const parsedJson = JSON.parse(element["Payload"]);
                            var imgUrl = element["ImageURLs"][0];
                            return (
                                <PropertyV
                                    key={index}
                                    imgURL={imgUrl}
                                    address={parsedJson["address"]}
                                    price={parsedJson["price"]}
                                    payload={parsedJson}
                                    postUUID={element["PostUuid"]}
                                />
                            );
                        })}
                </DisplayContainerProperty>
            </div>
        </section>
    );
}

function SoldProperties() {
    import("../styles/propertyEx.css");
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const uuid = queryParams.get("uuid");
    const ownerOfProfile = uuid === localStorage.getItem("uuid");

    const [data, setData] = useState();

    const fetchData = async () => {
        let result = await callAPI({ author_uuid: uuid, type: 1 });
        setData(result);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <section id="list">
            <div>
                <DisplayContainerProperty>
                    {!data ? <div className="no-posts">There are no posts here. Sell a property for a post to appear here.</div> : ""}
                    {data &&
                        data.map((element, index) => {
                            console.log(element);
                            const parsedJson = JSON.parse(element["Payload"]);
                            var imgUrl = element["ImageURLs"][0];
                            return (
                                <PropertyV
                                    key={index}
                                    imgURL={imgUrl}
                                    address={parsedJson["address"]}
                                    price={parsedJson["price"]}
                                    payload={parsedJson}
                                    postUUID={element["PostUuid"]}
                                />
                            );
                        })}
                </DisplayContainerProperty>
            </div>
        </section>
    );
}

async function callAPI(body) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/getPostData", {
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

async function callFollowingAPI(uuid) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/followingUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_uuid: localStorage.getItem("uuid"), target_uuid: uuid }),
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

async function followAPI(uuid) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/followUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: localStorage.getItem("token"), target_uuid: uuid }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData.message || "Network response was not ok");
        }

        return true;
    } catch (error) {
        console.error("Error:", error.message);
        return false;
    }
}

function Spotlights() {
    import("../styles/spotlightsEx.css");

    const [data, setData] = useState();

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const uuid = queryParams.get("uuid");

    const ownerOfProfile = uuid === localStorage.getItem("uuid");

    const fetchData = async () => {
        let result = await callAPI({ author_uuid: uuid, type: 2 });
        setData(result);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <SpotlightVC>
            {!data ? (
                <div className="no-posts">
                    There are no posts.{" "}
                    {ownerOfProfile ? (
                        <p>
                            Create a post <a href="/createPost">here</a>
                        </p>
                    ) : (
                        ""
                    )}
                </div>
            ) : (
                ""
            )}
            {data &&
                data.map((element) => {
                    var imgUrl = element["ImageURLs"][0];
                    const lastDotIndex = imgUrl.lastIndexOf(".");
                    const fileExtension = imgUrl.substring(lastDotIndex, imgUrl.length);
                    imgUrl = imgUrl.substring(0, lastDotIndex);
                    imgUrl = imgUrl + "_preview" + fileExtension;
                    return (
                        <SpotlightV
                            post_uuid={element.PostUuid}
                            author_uuid={uuid}
                            img_url={imgUrl}
                            title={element.Title}
                            likes={element.Likes}
                            comments={element.Comments}
                            description={element.Description}
                        />
                    );
                })}
        </SpotlightVC>
    );
}

function App() {
    import("../styles/profile.css");

    const [activeType, setActiveType] = useState(1);
    const [userData, setUserData] = useState();
    const [followingUser, setFollowingUser] = useState(false);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const uuid = queryParams.get("uuid");

    const ownerOfProfile = uuid === localStorage.getItem("uuid");

    const fetchUserData = async () => {
        let data = await callAPI2(uuid);
        setUserData(data);

        if (!ownerOfProfile) {
            let data2 = await callFollowingAPI(uuid);
            setFollowingUser(data2.following);
        }
    };

    useEffect(() => {
        fetchUserData();

        if (location) {
            const queryParams = new URLSearchParams(location.search);
            const current = queryParams.get("current");

            if (current) {
                setActiveType(parseInt(current));
            }
        }
    }, [location]);

    let { userid } = useParams();
    if (userid === undefined) {
        userid = "current";
    }

    const navigate = useNavigate();

    function changeType(type) {
        setActiveType(type);

        const updateUrl = (whereAt) => {
            const queryString = window.location.search;
            const queryParams = new URLSearchParams(queryString);
            const uuid = queryParams.get("uuid");
            // Construct the new URL with query parameters or path
            const newUrl = `/profile?uuid=` + uuid + "&current=" + whereAt;

            // Update the URL without reloading the page
            navigate(newUrl, { replace: true });
        };

        switch (type) {
            case 1:
                updateUrl("1");
                break;
            case 2:
                updateUrl("2");
                break;
            case 3:
                updateUrl("3");
                break;
        }
    }
    return (
        <main>
            <div className="userProfile">
                <div className="topInfo">
                    <UserProfile uuid={uuid} />
                    {ownerOfProfile ? (
                        ""
                    ) : (
                        <div
                            className="follow-user"
                            onClick={async () => {
                                let result = await followAPI(uuid);
                                console.log(result);
                                if (result) {
                                    setFollowingUser(!followingUser);
                                    let userData2 = userData;
                                    userData2.follower_amt += followingUser ? -1 : 1;
                                    setUserData(userData2);
                                }
                            }}
                        >
                            <img src={followingUser ? "/following-user.png" : "/follow-user.png"}></img>
                        </div>
                    )}
                    <div className="statsContainer">
                        <div className="statsFollowing">
                            <div>
                                <p>{userData && userData.follower_amt}</p>
                                <p>followers</p>
                            </div>
                            <div>
                                <p>{userData && userData.following_amt}</p>
                                <p>following</p>
                            </div>
                        </div>
                        <div className="profile_stats">
                            <div>
                                <p>{userData && userData.posts_amt}</p>
                                <p>posts</p>
                            </div>
                            <div>
                                <p>{userData && userData.properties_amt}</p>
                                <p>listings</p>
                            </div>
                            <div>
                                <p>{userData && userData.sold_amt}</p>
                                <p>sold</p>
                            </div>
                        </div>
                    </div>
                </div>
                {userData && ownerOfProfile && (userData.description === null || userData.description === "") ? (
                    <a
                        className="mini-button add-description"
                        onClick={() => {
                            window.location.href = "/settings#description";
                        }}
                    >
                        Add Description
                    </a>
                ) : (
                    ""
                )}
                {userData && ownerOfProfile ? (
                    <a
                        className="mini-button edit-profile"
                        onClick={() => {
                            window.location.href = "/settings";
                        }}
                    >
                        Edit Profile
                    </a>
                ) : (
                    ""
                )}
                <p className="profile-description">{userData && userData.description}</p>
                <div className="profileSelector">
                    <div
                        className={activeType === 1 ? "active" : ""}
                        onClick={() => {
                            changeType(1);
                        }}
                    >
                        <img src="/spotlight.png"></img>
                    </div>
                    <div
                        className={activeType === 2 ? "active" : ""}
                        onClick={() => {
                            changeType(2);
                        }}
                    >
                        <img src="/house.png"></img>
                    </div>
                    <div
                        className={activeType === 3 ? "active" : ""}
                        onClick={() => {
                            changeType(3);
                        }}
                    >
                        <img src="/sold-house.png"></img>
                    </div>
                </div>
            </div>
            <div className="profileDataContainer">
                <div id="background"></div>

                <div className="profileData">
                    {activeType === 1 ? <Spotlights /> : activeType === 2 ? <Properties /> : <SoldProperties />}
                </div>
            </div>
        </main>
    );
}

export default App;
