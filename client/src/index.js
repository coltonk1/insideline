import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Routes, BrowserRouter, Route } from "react-router-dom";

import UserProfile from "./pages/component/UserDisplay.js";

import "./index.css";
import HomePage from "./pages/HomePage.js";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import DesignPostPage from "./pages/DesignPostPage";
import HomePostPage from "./pages/HomePage.js";
import DesignDiscovery from "./pages/DesignDiscovery";
import SpotlightDiscovery from "./pages/SpotlightDiscovery";
import PropertyDiscovery from "./pages/PropertyDiscovery";
import ErrorPage from "./pages/ErrorPage";
import About from "./pages/About";
import Support from "./pages/Support";
import Map from "./pages/Map";
import Dev from "./pages/Dev";
import Pricing from "./pages/Pricing";
import CreatePost from "./pages/CreatePost";
import InvoiceData from "./pages/Invoice.js";
import SubDetails from "./pages/SubDetails.js";
import DiscoverMore from "./pages/DiscoverMore.js";
import Cookies from "./pages/Cookies.js";
import Privacy from "./pages/Privacy.js";
import Terms from "./pages/Terms.js";

import IndividualProperty from "./pages/IndividualProperty.js";
import IndividualSpotlight from "./pages/IndividualSpotlight.js";

import reportWebVitals from "./reportWebVitals";

import Logo from "./assets/logo_side_text.js";
import LogoMobile from "./assets/logo_no_text.js";
import LoadingLogo from "./assets/logo_no_text.js";

const selected = Boolean(parseInt(localStorage.getItem("selected"))) || false;
function select(select_) {
    localStorage.setItem("selected", select_);
    window.location.reload();
}

const pathName = window.location.pathname;
const excludeDivs = pathName === "/login" || pathName === "/settings" || pathName === "/signup";
const excludeFooter = pathName === "/login" || pathName === "/settings" || pathName === "/signup";

var menuOpened = false;
const MENUSIZE = 350;

const handleMouseUp = (e) => openMenu(true, e);

function openMenu(advanced = false, e) {
    if (advanced) {
        if (e.target.id === "mainMenu") return;
    }
    menuOpened = !menuOpened;
    document.querySelector("#mainMenu").style.right = (menuOpened ? 0 : -MENUSIZE) + "px";

    if (menuOpened) {
        window.addEventListener("mouseup", handleMouseUp);
    } else {
        window.removeEventListener("mouseup", handleMouseUp);
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
var token = localStorage.getItem("token");
if (token === "null") token = null;
const loggedIn = false || token !== null;

function Loading() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setIsLoading(false);

            setInterval(() => {
                if (localStorage.getItem("token") && !isJWTValid(localStorage.getItem("token"))) {
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                }
            }, 1000);
        }, 1000);

        return () => {};
    }, []);

    return (
        <div>
            {isLoading ? (
                <section id="loading">
                    <LoadingLogo className="img" />
                </section>
            ) : (
                ""
            )}
        </div>
    );
}

async function searchForAPI(search_string) {
    try {
        const response = await fetch(process.env.REACT_APP_SERVER_URL + "/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ search_string: search_string }),
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

function MainSearch() {
    const [searchedUsers, setSearchedUsers] = useState([]);
    return (
        <div className="user-search">
            <img src="/@-icon.png" className="left-input-image" />
            <img src="/search-icon.png" className="right-input-image" />
            <input
                placeholder="Search user"
                onChange={async (e) => {
                    let result = [];
                    console.log(e.target.value);
                    if (e.target.value && e.target.value !== "") {
                        result = await searchForAPI(e.target.value);
                        if (result === null) result = [];
                    }
                    setSearchedUsers(result);
                }}
            ></input>
            {searchedUsers.length > 0 ? (
                <div className="user-search-container">
                    {searchedUsers.map((data) => {
                        console.log(data);
                        return (
                            <div className="user-details-container" key={data.UserUUID}>
                                <img
                                    src={process.env.REACT_APP_SERVER_URL + "/images/" + data.UserUUID + "_pfp.jpg"}
                                    alt="Author"
                                    className="user-img"
                                    onClick={() => {
                                        window.location.href = "/profile?uuid=" + data.UserUUID;
                                    }}
                                />
                                <div
                                    className="user-details"
                                    onClick={() => {
                                        window.location.href = "/profile?uuid=" + data.UserUUID;
                                    }}
                                >
                                    <p>{data.DisplayName}</p>
                                    <p>@{data.Username}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                ""
            )}
        </div>
    );
}

root.render(
    <div>
        <p id="warning">
            This site is currently under active development. If you encounter an issue or have a request, please{" "}
            <a href="/support">contact us</a>.
        </p>
        <header>
            <a href="/home">
                <LogoMobile className="img condensed-logo" />
                <Logo className="img full-logo" />
            </a>

            <div className="header-links">
                <a href="/propertyDiscovery">Properties</a>
                <a href="/spotlightDiscovery">Spotlights</a>
                <a href="/pricing">Pricing</a>
                <a href="/support">Contact</a>
                <div className="right-side">
                    {!loggedIn ? (
                        <div className="login-signup">
                            <a href="/login">Log in</a>
                            <a className="lightSpecialButton" href="/signup">
                                Sign up
                            </a>
                        </div>
                    ) : (
                        ""
                    )}
                </div>
            </div>
            <MainSearch />
            <div className={!loggedIn ? "right-side logged-in-side" : "right-side"}>
                {!loggedIn ? (
                    <div className="login-signup">
                        <a href="/login">Log in</a>
                        <a className="lightSpecialButton" href="/signup">
                            Sign up
                        </a>
                    </div>
                ) : (
                    <div className="logged-in">
                        {/* <a className="create-post">
                            <img src="https://static-00.iconduck.com/assets.00/notification-icon-1842x2048-xr57og4y.png"></img>
                        </a> */}
                        <a href="/createPost" className="create-post">
                            <img src="/create-icon.png"></img>
                            <span>Create</span>
                        </a>
                        <a
                            className="header-profile"
                            onClick={(e) => {
                                if (document.querySelector("#signInHeaderInfo").style.display === "flex") {
                                    document.querySelector("#signInHeaderInfo").style.display = "none";
                                } else {
                                    document.querySelector("#signInHeaderInfo").style.display = "flex";
                                }
                                window.addEventListener("mouseup", (e) => {
                                    if (e.target !== document.querySelector("#signInHeaderInfo")) {
                                        document.querySelector("#signInHeaderInfo").style.display = "none";
                                        window.removeEventListener("mouseup", () => {});
                                    }
                                });
                            }}
                        >
                            <div className="profile-picture">
                                <img
                                    src={process.env.REACT_APP_SERVER_URL + "/images/" + localStorage.getItem("uuid") + "_pfp.jpg"}
                                    alt="Profile Picture"
                                ></img>
                            </div>
                        </a>
                    </div>
                )}
            </div>
            <div id="signInHeaderInfo">
                <div className="user-profile-info">
                    <UserProfile uuid={localStorage.getItem("uuid")} />
                </div>
                <div>
                    <a href={"/profile?uuid=" + localStorage.getItem("uuid")}>
                        <div>
                            <img src="/profile-icon.png"></img>
                        </div>
                        Profile
                    </a>
                </div>
                <div>
                    <a href={"/subInfo"}>
                        <div>
                            <img src="/subscription-icon.png"></img>
                        </div>
                        My Subscription
                    </a>
                </div>
                {/* <p>
                                    <a>Analytics</a>
                                </p> */}
                <div>
                    <a href="/settings">
                        <div>
                            <img src="/settings-icon.png"></img>
                        </div>
                        Settings
                    </a>
                </div>
                <div>
                    <a
                        onClick={() => {
                            localStorage.removeItem("token");
                            window.location.reload();
                        }}
                    >
                        <div>
                            <img src="/logout-icon.png"></img>
                        </div>
                        Log Out
                    </a>
                </div>
            </div>
            <div
                className="menu-popup"
                onClick={() => {
                    let element = document.getElementsByClassName("header-links")[0];
                    if (element.classList.contains("header-links-opened")) {
                        document.getElementsByClassName("header-links")[0].classList.remove("header-links-opened");
                    } else {
                        document.getElementsByClassName("header-links")[0].classList.add("header-links-opened");
                    }
                }}
            >
                <img src="https://www.svgrepo.com/show/509382/menu.svg"></img>
            </div>

            {/* <div className="mobile" id="userProfile">
                Sign in
            </div>
            <div className="mobile" id="openMenu">
                CON
            </div> */}
        </header>

        <Loading />
        <React.StrictMode>
            <BrowserRouter>
                <Routes>
                    <Route path="/" Component={HomePage}></Route>
                    <Route path="/home" Component={HomePage}></Route>
                    <Route path="/spotlightDiscovery" Component={SpotlightDiscovery}></Route>
                    <Route path="/designDiscovery" Component={DesignDiscovery}></Route>
                    <Route path="/propertyDiscovery" Component={PropertyDiscovery}></Route>
                    <Route path="/login" Component={Login}></Route>
                    <Route path="/signup" Component={Signup}></Route>
                    <Route path="/settings" Component={Settings}></Route>
                    <Route path="/pricing" Component={Pricing}></Route>
                    <Route path="/profile" Component={Profile}></Route>
                    <Route path="/profile/:userid" Component={Profile}></Route>
                    <Route path="/designPost" Component={DesignPostPage}></Route>
                    <Route path="/homePost" Component={HomePostPage}></Route>
                    <Route path="/about" Component={About}></Route>
                    <Route path="/support" Component={Support}></Route>
                    <Route path="/map" Component={Map}></Route>
                    <Route path="/dev" Component={Dev}></Route>
                    <Route path="/createPost" Component={CreatePost}></Route>
                    <Route path="/propertyInfo" Component={IndividualProperty}></Route>
                    <Route path="/spotlightInfo" Component={IndividualSpotlight}></Route>
                    <Route path="/invoice" Component={InvoiceData}></Route>
                    <Route path="/discoverMore" Component={DiscoverMore}></Route>
                    <Route path="/cookiePolicy" Component={Cookies}></Route>
                    <Route path="/subInfo" Component={SubDetails}></Route>
                    <Route path="/privacyPolicy" Component={Privacy}></Route>
                    <Route path="/tos" Component={Terms}></Route>
                    <Route path="*" Component={ErrorPage}></Route>
                </Routes>
            </BrowserRouter>
        </React.StrictMode>

        {!excludeFooter ? (
            <footer>
                <div>
                    <a href="/">Home</a>
                    <a href="/discoverMore">Properties</a>
                    <a href="/map">Map</a>
                    <a href="/designDiscovery">Spotlights</a>
                    <a href="/support">Contact & Support</a>
                    <a href="/pricing">Pricing</a>
                    <a href="/signup">Sign up</a>
                    <a href="/settings">Settings</a>
                </div>
                <div className="spacer" />
                <div>
                    <a href="/tos">Terms of Service</a>
                    <a href="/privacyPolicy">Privacy Policy</a>
                    <a href="/cookiePolicy">Cookie Policy</a>
                </div>
                <div className="spacer" />
                <a href="mail:inquiries@insidelineproperties.com">inquiries@insidelineproperties.com</a>
                <a href="tel:7707690132">(770) 769-0132</a>
                {/* <p className="left">Unnamed Company @ 2024</p> */}
            </footer>
        ) : (
            ""
        )}
    </div>
);

function isJWTValid(token) {
    if (!token) {
        return false;
    }

    const base64Url = token.split(".")[1]; // Get the payload part
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split("")
            .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
    );

    const payload = JSON.parse(jsonPayload);

    // Check if the token has an expiration time (exp)
    if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds
        return payload.exp > currentTime;
    }

    // If there's no expiration time, assume the token is still valid
    return true;
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals((e) => (e.entries[0].loadEventEnd ? console.log(e.entries[0].loadEventEnd) : ""));
